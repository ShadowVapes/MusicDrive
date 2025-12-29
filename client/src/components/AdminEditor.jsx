import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  apiCreateTrack,
  apiDeleteTrack,
  apiResolveUrl,
  apiUpdateTrack,
  apiUploadAudio,
  apiUploadCover
} from '../api.js';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect.js';

function coverFor(t) {
  return t.coverPath || t.coverUrl || '';
}

export default function AdminEditor({ selectedTrack, onUpdated, onCreated, onDeleted }) {
  const [local, setLocal] = useState(selectedTrack);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [resolving, setResolving] = useState(false);
  const createdIdRef = useRef(null);

  useEffect(() => {
    setLocal(selectedTrack);
    setStatus('');
    setErr('');
    createdIdRef.current = selectedTrack?.id || null;
  }, [selectedTrack?.id]);

  const canEdit = Boolean(local);

  const publishersString = useMemo(() => (local?.publishers || []).join(', '), [local?.publishers]);

  const setField = (k, v) => {
    setLocal((prev) => ({ ...(prev || {}), [k]: v }));
  };

  // Create draft track automatically when editor starts (new item)
  useEffect(() => {
    if (local?.id) return;
    // If no track selected, don't auto-create.
  }, [local?.id]);

  // Autosave (debounced)
  useDebouncedEffect(
    () => {
      if (!local) return;
      if (!local.id) return;
      const patch = {
        title: (local.title || '').trim(),
        publishers: (local.publishers || []).map((x) => String(x).trim()).filter(Boolean),
        sourceUrl: (local.sourceUrl || '').trim(),
        sourceType: (local.sourceType || '').trim(),
        coverUrl: (local.coverUrl || '').trim(),
        // downloadCover only when we have coverUrl and no local coverPath yet
        downloadCover: Boolean((local.coverUrl || '').trim()) && !local.coverPath
      };

      setStatus('mentés...');
      apiUpdateTrack(local.id, patch)
        .then((j) => {
          setStatus('mentve');
          setErr('');
          onUpdated?.(j.track);
        })
        .catch((e) => {
          setStatus('');
          setErr(String(e?.message || e));
        });
    },
    [local?.title, publishersString, local?.sourceUrl, local?.coverUrl],
    600
  );

  // Resolve link instantly (debounced)
  useDebouncedEffect(
    () => {
      const url = (local?.sourceUrl || '').trim();
      if (!url) return;
      setResolving(true);
      apiResolveUrl(url)
        .then((j) => {
          const d = j.data;
          if (!d) return;
          setLocal((prev) => {
            const next = { ...(prev || {}) };
            if (!next.title) next.title = d.title || '';
            if (!next.publishers?.length) next.publishers = d.publishers || [];
            next.coverUrl = d.coverUrl || next.coverUrl || '';
            next.sourceType = d.sourceType || next.sourceType || '';
            return next;
          });
          setErr('');
        })
        .catch(() => {
          // ignore
        })
        .finally(() => setResolving(false));
    },
    [local?.sourceUrl],
    450
  );

  const createNew = async () => {
    setErr('');
    setStatus('létrehozás...');
    try {
      const j = await apiCreateTrack({
        title: (local?.title || '').trim(),
        publishers: (local?.publishers || []).map((x) => String(x).trim()).filter(Boolean),
        sourceUrl: (local?.sourceUrl || '').trim(),
        sourceType: (local?.sourceType || '').trim(),
        coverUrl: (local?.coverUrl || '').trim()
      });
      setStatus('mentve');
      setLocal(j.track);
      createdIdRef.current = j.track.id;
      onCreated?.(j.track);
    } catch (e) {
      setStatus('');
      setErr(String(e?.message || e));
    }
  };

  const ensureCreated = async () => {
    if (local?.id) return local.id;
    await createNew();
    return createdIdRef.current;
  };

  const onUploadAudio = async (file) => {
    const id = await ensureCreated();
    if (!id) return;
    setStatus('mp3 feltöltés...');
    try {
      const j = await apiUploadAudio(id, file);
      setLocal(j.track);
      onUpdated?.(j.track);
      setStatus('mentve');
    } catch (e) {
      setStatus('');
      setErr(String(e?.message || e));
    }
  };

  const onUploadCover = async (file) => {
    const id = await ensureCreated();
    if (!id) return;
    setStatus('borító feltöltés...');
    try {
      const j = await apiUploadCover(id, file);
      setLocal(j.track);
      onUpdated?.(j.track);
      setStatus('mentve');
    } catch (e) {
      setStatus('');
      setErr(String(e?.message || e));
    }
  };

  const onDelete = async () => {
    const id = local?.id;
    if (!id) {
      setLocal(null);
      return;
    }
    setStatus('törlés...');
    try {
      await apiDeleteTrack(id);
      setStatus('');
      onDeleted?.(id);
    } catch (e) {
      setStatus('');
      setErr(String(e?.message || e));
    }
  };

  if (!canEdit) {
    return (
      <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/60">
        Válassz ki egy zenét balról, vagy nyomj egy újra.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Szerkesztő</div>
          <div className="text-xs text-white/50">
            Autosave megy. Linket beillesztesz → kitölti. {resolving ? <span className="pulse-soft">(tölt…)</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!local?.id ? (
            <button
              onClick={createNew}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
            >
              Létrehozás
            </button>
          ) : (
            <div className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70">ID: {local.id}</div>
          )}
          <button onClick={onDelete} className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold hover:bg-red-500/30">
            Törlés
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div>
            <label className="text-xs text-white/60">YouTube / Spotify link</label>
            <input
              value={local.sourceUrl || ''}
              onChange={(e) => setField('sourceUrl', e.target.value)}
              placeholder="https://open.spotify.com/track/... vagy https://youtu.be/..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Cím</label>
            <input
              value={local.title || ''}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Pl. Cigányzene 2000"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Kiadó(k) / előadó(k) (vesszővel)</label>
            <input
              value={publishersString}
              onChange={(e) => setField('publishers', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
              placeholder="Előadó 1, Előadó 2"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-white/60">MP3 feltöltés</label>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadAudio(f);
                  e.target.value = '';
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-white/50">{local.audioPath ? `ok: ${local.audioPath}` : 'még nincs mp3'}</div>
            </div>

            <div>
              <label className="text-xs text-white/60">Borító feltöltés</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadCover(f);
                  e.target.value = '';
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-white/50">{coverFor(local) ? 'van borító' : 'még nincs borító'}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status ? <div className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70">{status}</div> : null}
            {err ? <div className="rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-200">{err}</div> : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-black/30">
            <div className="aspect-square w-full bg-white/5">
              {coverFor(local) ? (
                <img src={coverFor(local)} alt="cover" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/30">nincs borító</div>
              )}
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold">{local.title || 'Névtelen'}</div>
              <div className="mt-1 text-xs text-white/60">{(local.publishers || []).join(', ')}</div>
              <div className="mt-2 text-[11px] text-white/40">
                source: {local.sourceType || '—'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-3 text-xs text-white/60">
            Ha beillesztett linkből jött borító, automatikusan letölti és eltárolja (ha még nincs feltöltött borítód).
          </div>
        </div>
      </div>
    </div>
  );
}
