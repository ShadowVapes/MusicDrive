export async function apiGetTracks() {
  const res = await fetch('/api/tracks');
  if (!res.ok) throw new Error('Failed to load tracks');
  return res.json();
}

export async function apiCreateTrack(payload) {
  const res = await fetch('/api/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) throw new Error('Failed to create track');
  return res.json();
}

export async function apiUpdateTrack(id, patch) {
  const res = await fetch(`/api/tracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch || {})
  });
  if (!res.ok) throw new Error('Failed to update track');
  return res.json();
}

export async function apiDeleteTrack(id) {
  const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete track');
  return res.json();
}

export async function apiUploadAudio(id, file) {
  const fd = new FormData();
  fd.append('audio', file);
  const res = await fetch(`/api/tracks/${id}/audio`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Audio upload failed');
  return res.json();
}

export async function apiUploadCover(id, file) {
  const fd = new FormData();
  fd.append('cover', file);
  const res = await fetch(`/api/tracks/${id}/cover`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cover upload failed');
  return res.json();
}

export async function apiResolveUrl(url) {
  const res = await fetch('/api/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.detail || j?.error || '';
    } catch {}
    throw new Error(detail || 'Resolve failed');
  }
  return res.json();
}
