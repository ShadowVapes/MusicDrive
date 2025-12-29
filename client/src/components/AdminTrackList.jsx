import React from 'react';

function coverFor(t) {
  return t.coverPath || t.coverUrl || '';
}

export default function AdminTrackList({ tracks, selectedId, onSelect }) {
  return (
    <div className="rounded-2xl bg-white/5 p-2">
      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-sm font-semibold">Zenék</div>
        <div className="text-xs text-white/50">{tracks.length} db</div>
      </div>

      <div className="max-h-[55vh] overflow-auto pr-1">
        {tracks.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/10 ${
                active ? 'bg-white/10' : ''
              }`}
            >
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-white/5">
                {coverFor(t) ? <img src={coverFor(t)} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title || 'Névtelen'}</div>
                <div className="truncate text-xs text-white/50">{(t.publishers || []).join(', ') || 'ismeretlen'}</div>
              </div>
              <div className={`text-xs ${t.audioPath ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                {t.audioPath ? 'mp3' : '—'}
              </div>
            </button>
          );
        })}

        {!tracks.length ? (
          <div className="px-2 py-6 text-center text-xs text-white/50">Még nincs semmi. Hozzáadsz egyet jobbra.</div>
        ) : null}
      </div>
    </div>
  );
}
