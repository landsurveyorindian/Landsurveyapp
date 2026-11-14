import * as maplibregl from 'maplibre-gl';

// Same-origin worker file in /public/maplibre-gl-worker.mjs
// This prevents cross-origin Blob URL revocation issues in Chrome/Safari
if (typeof window !== 'undefined') {
  try {
    if ((maplibregl as any).setWorkerUrl) {
      (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
    }
  } catch (e) {
    console.warn('MapLibre worker setup:', e);
  }
}

// 1x1 valid transparent PNG
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function getFallbackTileBuffer(): ArrayBuffer {
  const binary = atob(TRANSPARENT_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

function isValidImageBuffer(u8: Uint8Array): boolean {
  if (u8.length < 100) return false;
  // PNG: 89 50 4E 47
  const isPng = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
  // JPEG: FF D8
  const isJpeg = u8[0] === 0xff && u8[1] === 0xd8;
  // WebP: RIFF ... WEBP
  const isWebp =
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50;
  return isPng || isJpeg || isWebp;
}

// Custom protocol for Bhuvan with server proxy & client-side high-res fallback
// Guarantees zero blank screens on Vercel, static CDNs, or offline environments
if (typeof window !== 'undefined' && (maplibregl as any).addProtocol) {
  (maplibregl as any).addProtocol(
    'bhuvan',
    async (params: { url: string }, abortController: AbortController) => {
      // URL format: bhuvan://{z}/{x}/{y} or bhuvan://{bbox}
      const path = params.url.replace('bhuvan://', '');
      let z = 0;
      let x = 0;
      let y = 0;
      let isZxy = false;

      if (path.includes('/')) {
        const parts = path.split('/').map(Number);
        if (parts.length >= 3 && !parts.some(isNaN)) {
          [z, x, y] = parts;
          isZxy = true;
        }
      }

      // 1. Attempt server proxy route (/api/bhuvan-tile or /api/bhuvan-proxy)
      const proxyUrl = isZxy
        ? `/api/bhuvan-tile/${z}/${x}/${y}`
        : `/api/bhuvan-proxy?bbox=${encodeURIComponent(path)}&width=256&height=256`;

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 2500);

        const onAbort = () => timeoutController.abort();
        abortController.signal.addEventListener('abort', onAbort);

        const res = await fetch(proxyUrl, { signal: timeoutController.signal });
        clearTimeout(timeoutId);
        abortController.signal.removeEventListener('abort', onAbort);

        if (res.ok) {
          const data = await res.arrayBuffer();
          const u8 = new Uint8Array(data);
          if (isValidImageBuffer(u8)) {
            return { data };
          }
        }
      } catch (err: any) {
        if (abortController.signal.aborted) {
          throw err;
        }
        // Proxy failed (e.g., 404 on static Vercel, cold start timeout, or network error).
        // Proceed to direct high-res satellite fallbacks below.
      }

      // 2. Direct Client-Side Fallback A: Google Hybrid Satellite (open CORS, global coverage)
      if (isZxy) {
        try {
          const directUrl = `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
          const res = await fetch(directUrl, { signal: abortController.signal });
          if (res.ok) {
            const data = await res.arrayBuffer();
            const u8 = new Uint8Array(data);
            if (isValidImageBuffer(u8)) {
              return { data };
            }
          }
        } catch (err: any) {
          if (abortController.signal.aborted) throw err;
        }

        // 3. Direct Client-Side Fallback B: Esri World Imagery
        try {
          const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
          const res = await fetch(esriUrl, { signal: abortController.signal });
          if (res.ok) {
            const data = await res.arrayBuffer();
            const u8 = new Uint8Array(data);
            if (isValidImageBuffer(u8)) {
              return { data };
            }
          }
        } catch (err: any) {
          if (abortController.signal.aborted) throw err;
        }

        // 4. Direct Client-Side Fallback C: OpenStreetMap
        try {
          const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          const res = await fetch(osmUrl, { signal: abortController.signal });
          if (res.ok) {
            const data = await res.arrayBuffer();
            const u8 = new Uint8Array(data);
            if (isValidImageBuffer(u8)) {
              return { data };
            }
          }
        } catch (err: any) {
          if (abortController.signal.aborted) throw err;
        }
      }

      return { data: getFallbackTileBuffer() };
    }
  );

  // Custom protocol for Bhuvan Cadastral Boundary overlay
  (maplibregl as any).addProtocol(
    'bhuvan-cadastral',
    async (params: { url: string }, abortController: AbortController) => {
      const path = params.url.replace('bhuvan-cadastral://', '');
      let bbox = path;

      if (path.includes('/')) {
        const parts = path.split('/').map(Number);
        if (parts.length >= 3 && !parts.some(isNaN)) {
          bbox = tileToBBox3857(parts[1], parts[2], parts[0]);
        }
      }

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 2500);

        const onAbort = () => timeoutController.abort();
        abortController.signal.addEventListener('abort', onAbort);

        const res = await fetch(
          `/api/bhuvan-cadastral?bbox=${encodeURIComponent(bbox)}`,
          { signal: timeoutController.signal }
        );
        clearTimeout(timeoutId);
        abortController.signal.removeEventListener('abort', onAbort);

        if (res.ok) {
          const data = await res.arrayBuffer();
          const u8 = new Uint8Array(data);
          if (isValidImageBuffer(u8)) {
            return { data };
          }
        }
      } catch (err: any) {
        if (abortController.signal.aborted) throw err;
      }

      // If cadastral proxy is unavailable or tile has no parcels, return clean transparent buffer
      return { data: getFallbackTileBuffer() };
    }
  );
}

export { maplibregl };
