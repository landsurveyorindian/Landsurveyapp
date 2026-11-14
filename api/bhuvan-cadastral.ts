import type { IncomingMessage, ServerResponse } from 'http';
import { getBhuvanCadastralTile, tileToBBox3857, TRANSPARENT_PNG } from '../src/utils/bhuvanTileService.ts';

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
    let { bbox, z, x, y } = req.query || {};

    let bboxStr = typeof bbox === 'string' ? bbox : Array.isArray(bbox) ? bbox[0] : '';

    if (!bboxStr && z && x && y) {
      const zoom = parseInt(Array.isArray(z) ? z[0] : z, 10);
      const tileX = parseInt(Array.isArray(x) ? x[0] : x, 10);
      const tileY = parseInt(Array.isArray(y) ? y[0] : y, 10);
      if (!isNaN(zoom) && !isNaN(tileX) && !isNaN(tileY)) {
        bboxStr = tileToBBox3857(tileX, tileY, zoom);
      }
    }

    if (!bboxStr) {
      const match = (req.url || '').match(/\/api\/bhuvan-cadastral\/(\d+)\/(\d+)\/(\d+)/);
      if (match) {
        bboxStr = tileToBBox3857(parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[1], 10));
      }
    }

    if (!bboxStr) {
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(TRANSPARENT_PNG);
    }

    const { buffer, contentType } = await getBhuvanCadastralTile(bboxStr);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch (err: any) {
    console.error('Vercel Bhuvan cadastral error:', err);
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(TRANSPARENT_PNG);
  }
}
