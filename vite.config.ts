import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { put, del } from '@vercel/blob';

function attachBlobMiddleware(middlewares: any, token: string) {
  middlewares.use('/api/blob', async (req: any, res: any, next: any) => {
    try {
      const parsedUrl = new URL(req.url || '/', 'http://localhost');

      if (req.method === 'POST') {
        const pathname = parsedUrl.searchParams.get('pathname') || `documents/${Date.now()}_upload.bin`;
        const contentType = String(req.headers['content-type'] || 'application/octet-stream');
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        const blob = await put(pathname, buffer, {
          access: 'private',
          addRandomSuffix: true,
          contentType,
          token,
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            pathname: blob.pathname,
            contentType: blob.contentType || contentType,
            size: buffer.length,
          })
        );
        return;
      }

      if (req.method === 'GET') {
        const targetUrl = parsedUrl.searchParams.get('url');
        const isDownload = parsedUrl.searchParams.get('download') === '1';

        if (!targetUrl || !targetUrl.includes('.blob.vercel-storage.com/')) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Valid Vercel Blob URL required' }));
          return;
        }

        const upstream = await fetch(targetUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!upstream.ok) {
          res.statusCode = upstream.status;
          res.end(await upstream.text());
          return;
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await upstream.arrayBuffer());

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (isDownload) {
          const fileName = targetUrl.split('/').pop()?.split('?')[0] || 'document';
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
          res.setHeader('Content-Disposition', 'inline');
        }
        res.end(buffer);
        return;
      }

      if (req.method === 'DELETE') {
        const targetUrl = parsedUrl.searchParams.get('url');
        if (targetUrl) {
          await del(targetUrl, { token });
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ deleted: true }));
        return;
      }

      next();
    } catch (err: any) {
      console.error('Local Blob proxy error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Local blob upload failed' }));
    }
  });
}

function skolarBlobPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const token =
    env.BLOB_READ_WRITE_TOKEN ||
    env.VITE_BLOB_READ_WRITE_TOKEN ||
    'vercel_blob_rw_kqKxcWLpEJemlcvg_WgGyYRfchAxrhAyJIHg844g8LtXex7';

  return {
    name: 'skolar-vercel-blob-proxy',
    configureServer(server) {
      attachBlobMiddleware(server.middlewares, token);
    },
    configurePreviewServer(server) {
      attachBlobMiddleware(server.middlewares, token);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), skolarBlobPlugin(mode)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
}));
