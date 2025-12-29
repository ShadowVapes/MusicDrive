import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar.jsx';
import TrackGrid from '../components/TrackGrid.jsx';
import PlayerBar from '../components/PlayerBar.jsx';
import { apiGetTracks } from '../api.js';

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [currentId, setCurrentId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const j = await apiGetTracks();
      setTracks(j.tracks || []);

      // keep current if still exists
      setCurrentId((prev) => {
        if (prev && (j.tracks || []).some((t) => t.id === prev)) return prev;
        const firstPlayable = (j.tracks || []).find((t) => t.audioPath)?.id || null;
        return firstPlayable;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('tracksUpdated', () => load());
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tracks;
    return tracks.filter((t) => {
      const title = (t.title || '').toLowerCase();
      const pubs = (t.publishers || []).join(' ').toLowerCase();
      return title.includes(s) || pubs.includes(s);
    });
  }, [tracks, q]);

  const playableCount = useMemo(() => tracks.filter((t) => t.audioPath).length, [tracks]);

  return (
    <div className="h-dvh w-full">
      <div className="grid h-[calc(100dvh-76px)] grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <div className="h-full rounded-3xl bg-neutral-900/40">
            <Sidebar />
          </div>
        </div>

        <div className="h-full overflow-hidden rounded-3xl bg-neutral-900/40 shadow-glow">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="text-lg font-semibold">Hallgatás</div>
                <div className="text-xs text-white/50">{playableCount} lejátszható / {tracks.length} összesen</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Keresés…"
                  className="w-[180px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20 sm:w-[260px]"
                />
                <a
                  href="/admin"
                  className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
                >
                  Admin
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="text-sm text-white/60">Töltés…</div>
              ) : (
                <TrackGrid
                  tracks={filtered}
                  currentId={currentId}
                  onPlay={(id) => setCurrentId(id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <PlayerBar tracks={tracks.filter((t) => t.audioPath)} currentId={currentId} onPlayId={setCurrentId} />
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-[76px] left-0 right-0 lg:hidden">
        <div className="mx-3 rounded-2xl border border-white/10 bg-neutral-950/70 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <a href="/" className="rounded-xl bg-white/10 px-3 py-2">Hallgatás</a>
            <a href="/admin" className="rounded-xl bg-white px-3 py-2 font-semibold text-black">Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}
