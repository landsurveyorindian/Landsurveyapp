import type { IncomingMessage, ServerResponse } from 'http';
import { executeGeminiAction } from '../src/utils/geminiActions.ts';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[]>;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

import { validateAuthHeader, checkRateLimit, getCorsHeaders, getClientIp } from '../src/utils/geminiSecurity.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cors = getCorsHeaders(req);
  for (const [k, v] of Object.entries(cors)) {
    res.setHeader(k, v);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // 1. Validate Firebase ID Token / Authorization Bearer
  const authCheck = validateAuthHeader(req);
  if (!authCheck.ok) {
    return res.status(401).json({ error: authCheck.error });
  }

  // 2. Enforce per-IP sliding window rate limiting
  const clientIp = getClientIp(req);
  const rateCheck = checkRateLimit(clientIp, 40, 60000);
  if (!rateCheck.ok) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds || 30));
    return res.status(429).json({
      error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting AI analysis again.`,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on this Vercel deployment. Please add GEMINI_API_KEY in Vercel Project Settings > Environment Variables.',
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await parseBody(req);
    
    // Resolve action from query string (e.g. from vercel rewrite), URL path, or body.action
    let action = '';
    if (req.query?.action) {
      action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
    }

    if (!action && req.url) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const queryAction = parsedUrl.searchParams.get('action');
        if (queryAction) {
          action = queryAction;
        } else {
          const match = parsedUrl.pathname.match(/\/api\/gemini\/([a-zA-Z0-9_-]+)/);
          if (match) {
            action = match[1];
          }
        }
      } catch {
        // Fallback simple string matching
        const match = req.url.match(/\/api\/gemini\/([a-zA-Z0-9_-]+)/);
        if (match) action = match[1];
      }
    }

    if (!action && body?.action) {
      action = body.action;
    }

    if (!action) {
      return res.status(400).json({
        error: 'Missing Gemini action. Specify action in URL (/api/gemini/:action) or body.action.',
      });
    }

    const result = await executeGeminiAction(action, body, apiKey);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Vercel Gemini serverless error:', err);
    return res.status(500).json({
      error: err?.message || 'Gemini processing failed',
    });
  }
}
