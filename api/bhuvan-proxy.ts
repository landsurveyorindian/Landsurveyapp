import type { IncomingMessage, ServerResponse } from 'http';
import { bboxToTile, getBhuvanOrSatelliteTile, TRANSPARENT_PNG } from '../src/utils/bhuvanTileService.ts';

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
    const { bbox } = req.query || {};
    const bboxStr = typeof bbox === 'string' ? bbox : Array.isArray(bbox) ? bbox[0] : '';

    if (!bboxStr) {
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(TRANSPARENT_PNG);
    }

    const tile = bboxToTile(bboxStr);
    if (tile) {
      const { buffer, contentType } = await getBhuvanOrSatelliteTile(tile.z, tile.x, tile.y);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.status(200).send(buffer);
    }

    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(TRANSPARENT_PNG);
  } catch (err: any) {
    console.error('Vercel Bhuvan proxy error:', err);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(TRANSPARENT_PNG);
  }
}
