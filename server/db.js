import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, { tracks: [] });

export async function initDB() {
  await db.read();
  db.data ||= { tracks: [] };
  db.data.tracks ||= [];
  await db.write();
}

export async function listTracks() {
  await db.read();
  const tracks = db.data.tracks || [];
  return tracks
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getTrack(id) {
  await db.read();
  return (db.data.tracks || []).find((t) => t.id === id) || null;
}

export async function createTrack(track) {
  await db.read();
  db.data.tracks.push(track);
  await db.write();
  return track;
}

export async function updateTrack(id, patch) {
  await db.read();
  const idx = (db.data.tracks || []).findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.data.tracks[idx] = { ...db.data.tracks[idx], ...patch };
  await db.write();
  return db.data.tracks[idx];
}

export async function deleteTrack(id) {
  await db.read();
  const before = db.data.tracks.length;
  db.data.tracks = db.data.tracks.filter((t) => t.id !== id);
  await db.write();
  return db.data.tracks.length !== before;
}
