import React from 'react';

function coverFor(t) {
  return t.coverPath || t.coverUrl || '';
}

export default function TrackGrid({ tracks, currentId, onPlay }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {tracks.map((t) => {
        const active = t.id === currentId;
        return (
          <button
            key={t.id}
            onClick={() => onPlay(t.id)}
            className={`group rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/10 ${
              active ? 'ring-1 ring-white/20' : ''
            }`}
          >
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-white/5">
              {coverFor(t) ? (
                <img
                  src={coverFor(t)}
                  alt="cover"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                  nincs borító
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="line-clamp-1 text-sm font-semibold">{t.title || 'Névtelen track'}</div>
              <div className="mt-1 line-clamp-1 text-xs text-white/60">
                {(t.publishers || []).join(', ') || 'ismeretlen'}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active ? 'bg-white text-black' : 'bg-white/10 text-white'
                }`}
              >
                {active ? 'Most megy' : 'Lejátszás'}
              </div>
              {t.audioPath ? (
                <div className="text-xs text-white/40">mp3</div>
              ) : (
                <div className="text-xs text-amber-200/70">nincs mp3</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
