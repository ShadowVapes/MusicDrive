import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { Server as SocketIOServer } from 'socket.io';

import { initDB, listTracks, getTrack, createTrack, updateTrack, deleteTrack } from './db.js';
import { resolveFromUrl } from './utils/resolve.js';
import { downloadCoverToFile } from './utils/download.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: true }
});

function notifyUpdate() {
  io.emit('tracksUpdated', { at: Date.now() });
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer temp storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB
});

// API
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/tracks', async (req, res) => {
  const tracks = await listTracks();
  res.json({ tracks });
});

app.post('/api/tracks', async (req, res) => {
  const now = Date.now();
  const id = nanoid(10);
  const body = req.body || {};

  const track = {
    id,
    title: (body.title || '').trim(),
    publishers: Array.isArray(body.publishers)
      ? body.publishers.map((x) => String(x).trim()).filter(Boolean)
      : String(body.publishers || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
    coverUrl: (body.coverUrl || '').trim(),
    coverPath: (body.coverPath || '').trim(),
    audioPath: (body.audioPath || '').trim(),
    sourceType: (body.sourceType || '').trim(),
    sourceUrl: (body.sourceUrl || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  await createTrack(track);
  notifyUpdate();
  res.json({ track });
});

app.put('/api/tracks/:id', async (req, res) => {
  const id = req.params.id;
  const patch = req.body || {};
  const now = Date.now();

  // Optional cover download
  let coverPatch = {};
  if (patch.downloadCover && patch.coverUrl) {
    try {
      const result = await downloadCoverToFile({ url: patch.coverUrl, trackId: id });
      coverPatch = { coverPath: result.coverPath };
    } catch (e) {
      // don't fail whole update
      coverPatch = {};
    }
  }

  const normalized = {
    ...patch,
    ...coverPatch,
    updatedAt: now
  };
  delete normalized.downloadCover;

  if (typeof normalized.publishers === 'string') {
    normalized.publishers = normalized.publishers
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (Array.isArray(normalized.publishers)) {
    normalized.publishers = normalized.publishers.map((x) => String(x).trim()).filter(Boolean);
  }

  const updated = await updateTrack(id, normalized);
  if (!updated) return res.status(404).json({ error: 'Not found' });

  notifyUpdate();
  res.json({ track: updated });
});

app.delete('/api/tracks/:id', async (req, res) => {
  const id = req.params.id;
  const track = await getTrack(id);
  if (!track) return res.status(404).json({ error: 'Not found' });

  // Attempt to remove files
  const tryRemove = async (p) => {
    if (!p) return;
    const rel = p.startsWith('/uploads/') ? p.replace('/uploads/', '') : null;
    if (!rel) return;
    const abs = path.join(__dirname, 'uploads', rel);
    try {
      await fs.unlink(abs);
    } catch {
      // ignore
    }
  };

  await tryRemove(track.audioPath);
  await tryRemove(track.coverPath);

  await deleteTrack(id);
  notifyUpdate();
  res.json({ ok: true });
});

app.post('/api/tracks/:id/audio', upload.single('audio'), async (req, res) => {
  const id = req.params.id;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing file' });

  const ext = '.mp3';
  const fileName = `${id}-${Date.now()}${ext}`;
  const abs = path.join(__dirname, 'uploads', 'audio', fileName);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, file.buffer);

  const updated = await updateTrack(id, { audioPath: `/uploads/audio/${fileName}`, updatedAt: Date.now() });
  if (!updated) return res.status(404).json({ error: 'Not found' });

  notifyUpdate();
  res.json({ track: updated });
});

app.post('/api/tracks/:id/cover', upload.single('cover'), async (req, res) => {
  const id = req.params.id;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing file' });

  const mimeType = file.mimetype || '';
  const ext = mimeType.includes('png')
    ? '.png'
    : mimeType.includes('webp')
    ? '.webp'
    : '.jpg';

  const fileName = `${id}-${Date.now()}${ext}`;
  const abs = path.join(__dirname, 'uploads', 'covers', fileName);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, file.buffer);

  const updated = await updateTrack(id, { coverPath: `/uploads/covers/${fileName}`, updatedAt: Date.now() });
  if (!updated) return res.status(404).json({ error: 'Not found' });

  notifyUpdate();
  res.json({ track: updated });
});

app.post('/api/resolve', async (req, res) => {
  const url = (req.body?.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const data = await resolveFromUrl(url);
    res.json({ data });
  } catch (e) {
    res.status(400).json({ error: 'Resolve failed', detail: String(e?.message || e) });
  }
});

// Serve client build if present
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', async (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) return next();
  try {
    return res.sendFile(path.join(clientDist, 'index.html'));
  } catch {
    return next();
  }
});

io.on('connection', (socket) => {
  socket.emit('hello', { ok: true });
});

await initDB();
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
