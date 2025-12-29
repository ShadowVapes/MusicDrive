import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar.jsx';
import AdminTrackList from '../components/AdminTrackList.jsx';
import AdminEditor from '../components/AdminEditor.jsx';
import { apiCreateTrack, apiGetTracks } from '../api.js';

export default function Admin() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const j = await apiGetTracks();
      setTracks(j.tracks || []);

      setSelectedId((prev) => {
        if (prev && (j.tracks || []).some((t) => t.id === prev)) return prev;
        return (j.tracks || [])[0]?.id || null;
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

  const selectedTrack = useMemo(() => tracks.find((t) => t.id === selectedId) || null, [tracks, selectedId]);

  const onUpdated = (t) => {
    setTracks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  };

  const onCreated = (t) => {
    setTracks((prev) => [t, ...prev.filter((x) => x.id !== t.id)]);
    setSelectedId(t.id);
  };

  const onDeleted = (id) => {
    setTracks((prev) => prev.filter((x) => x.id !== id));
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      return tracks.filter((x) => x.id !== id)[0]?.id || null;
    });
  };

  const newBlank = async () => {
    // Create instantly so uploads can work immediately
    const j = await apiCreateTrack({ title: '', publishers: [], sourceUrl: '', coverUrl: '' });
    onCreated(j.track);
  };

  return (
    <div className="h-dvh w-full">
      <div className="grid h-full grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <div className="h-full rounded-3xl bg-neutral-900/40">
            <Sidebar />
          </div>
        </div>

        <div className="h-full overflow-hidden rounded-3xl bg-neutral-900/40 shadow-glow">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="text-lg font-semibold">Admin</div>
                <div className="text-xs text-white/50">Feltöltés + autosave + realtime</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={newBlank}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
                >
                  Új zene
                </button>
                <a href="/" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                  Vissza
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="text-sm text-white/60">Töltés…</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
                  <AdminTrackList tracks={tracks} selectedId={selectedId} onSelect={setSelectedId} />
                  <AdminEditor selectedTrack={selectedTrack} onUpdated={onUpdated} onCreated={onCreated} onDeleted={onDeleted} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="fixed bottom-3 left-3 right-3 lg:hidden">
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-2 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <a href="/" className="rounded-xl bg-white/10 px-3 py-2">Hallgatás</a>
            <button onClick={newBlank} className="rounded-xl bg-white px-3 py-2 font-semibold text-black">Új</button>
          </div>
        </div>
      </div>
    </div>
  );
}
