import React, { useEffect, useMemo, useRef, useState } from 'react';

function coverFor(t) {
  return t?.coverPath || t?.coverUrl || '';
}

function fmt(sec) {
  if (!Number.isFinite(sec)) return '0:00';
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function PlayerBar({ tracks, currentId, onPlayId }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.9);

  const current = useMemo(() => tracks.find((t) => t.id === currentId) || null, [tracks, currentId]);
  const idx = useMemo(() => tracks.findIndex((t) => t.id === currentId), [tracks, currentId]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = vol;
  }, [vol]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setPos(a.currentTime || 0);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => {
      setIsPlaying(false);
      // autó next
      if (tracks.length && idx >= 0) {
        const next = tracks[(idx + 1) % tracks.length];
        if (next?.audioPath) onPlayId(next.id);
      }
    };

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [tracks, idx, onPlayId]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (!current?.audioPath) {
      a.pause();
      setIsPlaying(false);
      return;
    }

    a.src = current.audioPath;
    a.currentTime = 0;
    a.load();

    // autó play ha lehet
    a
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [currentId]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!current?.audioPath) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const seek = (v) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(v);
    setPos(Number(v));
  };

  const prev = () => {
    if (!tracks.length) return;
    const prevT = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prevT?.id) onPlayId(prevT.id);
  };

  const next = () => {
    if (!tracks.length) return;
    const nextT = tracks[(idx + 1) % tracks.length];
    if (nextT?.id) onPlayId(nextT.id);
  };

  return (
    <div className="border-t border-white/10 bg-neutral-950/80 backdrop-blur">
      <audio ref={audioRef} />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3">
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/5">
            {coverFor(current) ? (
              <img src={coverFor(current)} alt="cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">nincs</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{current?.title || 'Válassz egy tracket'}</div>
            <div className="truncate text-xs text-white/60">{(current?.publishers || []).join(', ')}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              title="Előző"
            >
              ◀
            </button>
            <button
              onClick={toggle}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                current?.audioPath ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white/40'
              }`}
              title="Play/Pause"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={next}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
              title="Következő"
            >
              ▶
            </button>
          </div>

          <div className="flex w-full items-center gap-2">
            <div className="w-10 text-right text-[11px] text-white/50">{fmt(pos)}</div>
            <input
              type="range"
              min={0}
              max={dur || 0}
              value={Math.min(pos, dur || 0)}
              onChange={(e) => seek(e.target.value)}
              className="w-full accent-white"
            />
            <div className="w-10 text-[11px] text-white/50">{fmt(dur)}</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="text-xs text-white/50">vol</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            className="w-28 accent-white"
          />
        </div>
      </div>
    </div>
  );
}
