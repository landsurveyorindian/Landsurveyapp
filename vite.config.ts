import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'suppress-hmr-websocket-error',
        transform(code, id) {
          if (id.includes('vite/dist/client/client.mjs') || id.includes('@vite/client')) {
            return code
              .replace(
                'let isConnected = !invokeableTransport.connect;',
                'let isConnected = true;'
              )
              .replace(
                'ws.send(JSON.stringify(data));',
                'ws?.send(JSON.stringify(data));'
              )
              .replace(
                /reject\(\/\* @__PURE__ \*\/ new Error\("WebSocket closed without opened\."\)\);/g,
                'resolve();'
              )
              .replace(
                'transport.connect(createHMRHandler(handleMessage));',
                '// HMR disabled'
              );
          }
          return null;
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/maplibre-gl')) {
              return 'maplibre-vendor';
            }
            if (
              id.includes('node_modules/shpjs') ||
              id.includes('node_modules/dxf-parser') ||
              id.includes('node_modules/@tmcw/togeojson') ||
              id.includes('node_modules/proj4') ||
              id.includes('node_modules/@turf')
            ) {
              return 'gis-vendor';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
              return 'pdf-vendor';
            }
            if (id.includes('node_modules/firebase')) {
              return 'firebase-vendor';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
      watch: null,
    },
  };
});
