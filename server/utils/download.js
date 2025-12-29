import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'covers');

function safeExt(contentType, url) {
  const byMime = mime.extension(contentType || '');
  if (byMime) return `.${byMime}`;
  const m = (url || '').match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
  if (m) return `.${m[1].toLowerCase()}`;
  return '.jpg';
}

export async function downloadCoverToFile({ url, trackId }) {
  if (!url || !trackId) throw new Error('Missing url/trackId');

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'zenelojatszo/1.0' } });
    if (!res.ok) throw new Error(`Failed to download cover (HTTP ${res.status})`);

    const contentType = res.headers.get('content-type') || '';
    const ext = safeExt(contentType, url);
    const fileName = `${trackId}${ext}`;
    const filePath = path.join(COVERS_DIR, fileName);

    const buf = Buffer.from(await res.arrayBuffer());
    // Soft limit (10MB)
    if (buf.length > 10 * 1024 * 1024) throw new Error('Cover too large');

    await fs.mkdir(COVERS_DIR, { recursive: true });
    await fs.writeFile(filePath, buf);

    return {
      coverPath: `/uploads/covers/${fileName}`,
      bytes: buf.length,
      contentType
    };
  } finally {
    clearTimeout(to);
  }
}
