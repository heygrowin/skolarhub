import { put, del } from '@vercel/blob';

function getToken(): string {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VITE_BLOB_READ_WRITE_TOKEN ||
    'vercel_blob_rw_kqKxcWLpEJemlcvg_WgGyYRfchAxrhAyJIHg844g8LtXex7'
  );
}

async function readBuffer(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  const token = getToken();
  const baseUrl = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseUrl);

  try {
    if (req.method === 'POST') {
      const pathname = parsedUrl.searchParams.get('pathname') || `documents/${Date.now()}_upload.bin`;
      const contentType = String(req.headers['content-type'] || 'application/octet-stream');
      const bodyBuffer = await readBuffer(req);

      const blob = await put(pathname, bodyBuffer, {
        access: 'private',
        addRandomSuffix: true,
        contentType,
        token,
      });

      res.status(200).json({
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType || contentType,
        size: bodyBuffer.length,
      });
      return;
    }

    if (req.method === 'GET') {
      const targetUrl = parsedUrl.searchParams.get('url');
      const isDownload = parsedUrl.searchParams.get('download') === '1';

      if (!targetUrl || !targetUrl.includes('.blob.vercel-storage.com/')) {
        res.status(400).json({ error: 'Valid Vercel Blob URL required' });
        return;
      }

      const upstream = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).send(await upstream.text());
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const arrayBuf = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      if (isDownload) {
        const fileName = targetUrl.split('/').pop()?.split('?')[0] || 'document';
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      } else {
        res.setHeader('Content-Disposition', 'inline');
      }

      res.status(200).send(buffer);
      return;
    }

    if (req.method === 'DELETE') {
      const targetUrl = parsedUrl.searchParams.get('url');
      if (targetUrl) {
        await del(targetUrl, { token });
      }
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Vercel Blob API error:', err);
    res.status(500).json({ error: err?.message || 'Blob operation failed' });
  }
}

