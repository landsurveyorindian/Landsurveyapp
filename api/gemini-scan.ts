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
      error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting AI document scanning again.`,
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
    const { imageBase64, mimeType, docHint } = body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const cleanMime = mimeType === 'application/pdf' ? 'application/pdf' : (mimeType || 'image/jpeg');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = `You are a certified Indian Land Records and Cadastral Survey specialist analyzing an uploaded Indian land document (such as a PDF or image of an Andhra Pradesh 1-B Adangal / ROR, Telangana Dharani Pahani, Tamil Nadu Patta/Chitta, Karnataka Bhoomi RTC, Maharashtra 7/12 Utara, Gujarat AnyROR / 8A / 7-12, or an FMB Field Measurement Book sketch).
${docHint ? `Document Hint: ${docHint}` : ''}

Analyze this ${cleanMime === 'application/pdf' ? 'PDF document' : 'image'} thoroughly and extract all identifiable cadastral and ownership details into JSON:
- surveyNumber: string (e.g. "142/2B", "89/Part", "Block 45")
- village: string (e.g. "Kaza", "Shamshabad", "Sanand")
- mandalOrTaluk: string (e.g. "Mangalagiri", "Serilingampally", "Sanand")
- district: string (e.g. "Guntur", "Rangareddy", "Ahmedabad")
- state: string (e.g. "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Maharashtra", "Gujarat")
- ownerName: string (Pattadar / Khatedar / Landowner name)
- extentAcres: number or null (e.g. 1.25)
- extentCents: number or null (e.g. 125)
- extentGuntas: number or null (e.g. 10)
- landClassification: string (e.g. "Wet (Tari)", "Dry (Khushki)", "Ryotwari Patta", "Inam", "Government", "Jirayat", "Bagayat")
- summary: brief 1-2 sentence description of what the document confirms, its validity, and key boundaries if mentioned.

Return ONLY a valid JSON object matching these exact keys. If a field cannot be found, use an empty string or null.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: cleanMime,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    try {
      const parsed = JSON.parse(response.text || '{}');
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        rawText: response.text,
        error: 'Could not parse structured JSON response',
      });
    }
  } catch (err: any) {
    console.error('Vercel Gemini scan doc error:', err);
    return res.status(500).json({ error: err.message || 'Gemini document analysis failed' });
  }
}
