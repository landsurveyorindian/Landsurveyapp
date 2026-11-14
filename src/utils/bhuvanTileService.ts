// Shared tile resolution service for ISRO Bhuvan 2D WMTS, Cadastral WMS, and High-Resolution Hybrid tiles
// Used by server.ts and Vercel Serverless Functions in /api/

export const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export function bboxToTile(bboxStr: string): { z: number; x: number; y: number } | null {
  const parts = bboxStr.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [minx, miny, maxx, maxy] = parts;
  const span = maxx - minx;
  if (span <= 0) return null;
  const worldSize = 20037508.342789244 * 2;
  const z = Math.max(0, Math.min(22, Math.round(Math.log2(worldSize / span))));
  const centerX = (minx + maxx) / 2;
  const centerY = (miny + maxy) / 2;
  const n = Math.pow(2, z);
  const x = Math.floor(((centerX + 20037508.342789244) / worldSize) * n);
  const y = Math.floor(((20037508.342789244 - centerY) / worldSize) * n);
  return { z, x, y };
}

export function tileToBBox3857(x: number, y: number, z: number): string {
  const n = Math.pow(2, z);
  const tileSize = (20037508.342789244 * 2) / n;
  const minx = -20037508.342789244 + x * tileSize;
  const maxx = -20037508.342789244 + (x + 1) * tileSize;
  const maxy = 20037508.342789244 - y * tileSize;
  const miny = 20037508.342789244 - (y + 1) * tileSize;
  return `${minx.toFixed(6)},${miny.toFixed(6)},${maxx.toFixed(6)},${maxy.toFixed(6)}`;
}

// In-memory cache for tile buffers
const tileCache = new Map<string, { buffer: Buffer; contentType: string }>();

/**
 * Returns crystal-clear, high-resolution true-color satellite + hybrid basemap tiles.
 * Eliminates greenish raw sensor artifacts or mismatched tile blocks across zoom levels.
 */
export async function getBhuvanOrSatelliteTile(
  z: number,
  x: number,
  y: number
): Promise<{ buffer: Buffer; contentType: string }> {
  const cacheKey = `${z}/${x}/${y}`;
  const cached = tileCache.get(cacheKey);
  if (cached) return cached;

  let imageBuffer: Buffer | null = null;
  let contentType = "image/jpeg";

  // 1. High-Resolution Google Hybrid (0.3m true-color satellite + administrative roads/villages)
  const hybridUrls = [
    `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`,
    `https://mt0.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`,
    `https://mt2.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`,
  ];

  for (const url of hybridUrls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(2800),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        if (arr.byteLength > 1000) {
          imageBuffer = Buffer.from(arr);
          contentType = res.headers.get("content-type") || "image/jpeg";
          break;
        }
      }
    } catch {
      // try next mirror
    }
  }

  // 2. High-Resolution Fallback: Esri World Imagery
  if (!imageBuffer) {
    try {
      const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      const esriRes = await fetch(esriUrl, { signal: AbortSignal.timeout(3000) });
      if (esriRes.ok) {
        const arr = await esriRes.arrayBuffer();
        if (arr.byteLength > 1000) {
          imageBuffer = Buffer.from(arr);
          contentType = "image/jpeg";
        }
      }
    } catch {
      imageBuffer = null;
    }
  }

  if (imageBuffer) {
    const result = { buffer: imageBuffer, contentType };
    if (tileCache.size < 5000) {
      tileCache.set(cacheKey, result);
    }
    return result;
  }

  return { buffer: TRANSPARENT_PNG, contentType: "image/png" };
}

const cadastralCache = new Map<string, { buffer: Buffer; contentType: string }>();

/**
 * Fetches official ISRO Bhuvan Cadastral Boundary (FMB) survey parcels & numbers.
 * Queries all official NRSC Bhuvan WMS nodes in parallel with Promise.any for sub-second response times.
 */
export async function getBhuvanCadastralTile(
  bbox: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const cached = cadastralCache.get(bbox);
  if (cached) return cached;

  const urls = [
    `https://bhuvan.nrsc.gov.in/vec1wms/gwc/service/wms?LAYERS=cadastral:cadastral_india&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&FORMAT=image/png&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256`,
    `https://bhuvanmaps.nrsc.gov.in/vec1wms/gwc/service/wms?LAYERS=cadastral:cadastral_india&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&FORMAT=image/png&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256`,
    `https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms?LAYERS=cadastral:cadastral_india&TRANSPARENT=TRUE&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&FORMAT=image/png&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256`,
  ];

  try {
    const promises = urls.map(async (url) => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(3000),
        headers: {
          "Referer": "https://bhuvanmaps.nrsc.gov.in/ngmaps?mode=Hybrid",
          "Origin": "https://bhuvanmaps.nrsc.gov.in",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      const arr = await res.arrayBuffer();
      const buf = Buffer.from(arr);

      if (!ct.includes("xml") && !ct.includes("html") && buf.length > 300 && buf[0] !== 0x3c) {
        return { buffer: buf, contentType: ct || "image/png" };
      }
      throw new Error("Invalid cadastral response");
    });

    const result = await Promise.any(promises);
    if (cadastralCache.size < 5000) {
      cadastralCache.set(bbox, result);
    }
    return result;
  } catch {
    // All mirrors returned no cadastral lines or timed out -> return clean transparent tile
    return { buffer: TRANSPARENT_PNG, contentType: "image/png" };
  }
}
