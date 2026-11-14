import type { IncomingMessage, ServerResponse } from 'http';
import { getBhuvanOrSatelliteTile, TRANSPARENT_PNG } from '../src/utils/bhuvanTileService.ts';

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  send: (data: any) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  try {
    let { z, x, y } = req.query || {};

    // Support direct path regex if rewrites pass URL directly
    if (!z || !x || !y) {
      const match = (req.url || '').match(/\/api\/bhuvan-tile\/(\d+)\/(\d+)\/(\d+)/);
      if (match) {
        z = match[1];
        x = match[2];
        y = match[3];
      }
    }

    const zoom = parseInt(Array.isArray(z) ? z[0] : z, 10);
    const tileX = parseInt(Array.isArray(x) ? x[0] : x, 10);
    const tileY = parseInt(Array.isArray(y) ? y[0] : y, 10);

    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(TRANSPARENT_PNG);
    }

    const { buffer, contentType } = await getBhuvanOrSatelliteTile(zoom, tileX, tileY);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('Vercel Bhuvan tile error:', err);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(TRANSPARENT_PNG);
  }
}
