import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body?: any;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

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
  const rateCheck = checkRateLimit(clientIp, 30, 60000);
  if (!rateCheck.ok) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds || 30));
    return res.status(429).json({
      error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting AI plot explanation again.`,
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
    const { query, plotData, contextType } = body || {};

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemInstruction = `You are an expert Cadastral Surveyor, Geomatics Engineer, and Indian Land Revenue Specialist with deep knowledge across all Indian States (Andhra Pradesh, Telangana, Tamil Nadu, Karnataka, Maharashtra, Gujarat, Kerala, Odisha, Rajasthan, Uttar Pradesh, etc.).
You assist Indian land surveyors, patwaris, revenue officers, advocates, and property buyers in understanding:
1. Land Survey & Revenue Processes across Indian States: (e.g. Gujarat DILR Resurvey & Pramanpatra process, AnyROR portal, Village Form 7/12 & 8A; AP/Telangana YSR Jagananna Shaswatha Bhu Hakku / Dharani / Webland & F-line demarcation; Tamil Nadu TamilNilam & FMB; Karnataka Bhoomi & Mojini; Maharashtra MahaBhulekh / E-Peek Pahani).
2. Quadrilateral & Irregular Area Discrepancies: Explain why Brahmagupta's Cyclic formula gives the theoretical maximum area for an inscribed quadrilateral, why the traditional Patwari Average method (((a+c)/2) * ((b+d)/2)) always overestimates or distorts non-rectangular land, and why diagonal triangulation (Heron's formula dividing into 2 triangles) is the only legally defensible, exact ground truth method used by Survey & Settlement Departments.
3. Bowditch Closing Error (Compass Rule): Interpret linear misclosure, angular closing error, and precision ratios (e.g. 1:1000 for rough field reconnaissance vs 1:5000+ required for boundary settlement). Explain whether a traverse passes the permissible error limit under standard Indian Cadastral Survey rules.
4. Modern Geomatics: Total Stations, DGPS/GNSS RTK Rovers, CORS networks, Bhuvan ISRO satellite imagery, WGS84 to UTM Zone projections, and GIS shapefile integration.

Keep answers professional, practical, encouraging, and easy to understand for field surveyors and landowners. Format your answer with clear headers, concise bullet points, and actionable next steps.`;

    const prompt = `Context: ${contextType || 'general'}
Plot Data / Parameters: ${JSON.stringify(plotData || {})}
User Question: "${query}"

Provide a clear, practical, and comprehensive explanation with relevant Indian survey regulations, legal frameworks, and field practices.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return res.status(200).json({
      answer: response.text || 'Unable to generate explanation.',
    });
  } catch (err: any) {
    console.error('Vercel Gemini explain plot error:', err);
    return res.status(500).json({ error: err.message || 'Gemini plot explanation failed' });
  }
}
