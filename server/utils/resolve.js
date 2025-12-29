function isYouTube(url) {
  return /(^|\.)youtube\.com\//i.test(url) || /youtu\.be\//i.test(url);
}

function isSpotify(url) {
  return /(^|\.)spotify\.com\//i.test(url) || /open\.spotify\.com\//i.test(url);
}

function clean(s) {
  return (s || '').toString().trim();
}

function splitArtists(raw) {
  // Accept: "A, B" or "A • B" or "A · B" etc.
  const s = clean(raw);
  if (!s) return [];
  return s
    .split(/\s*(?:,|\s·\s|\s•\s|\s\|\s|\s\/\s|\s&\s)\s*/g)
    .map((x) => clean(x))
    .filter(Boolean);
}

function parseSpotifyTitle(title) {
  // Often: "Track Name - Single by Artist" or "Track Name • Artist" or "Track Name".
  const t = clean(title);
  if (!t) return { title: '', publishers: [] };

  // Common: "<song> - Single by <artist>" (oEmbed title for tracks)
  const m1 = t.match(/^(.*?)\s+-\s+.*?\s+by\s+(.*)$/i);
  if (m1) {
    return { title: clean(m1[1]), publishers: splitArtists(m1[2]) };
  }

  // Common: "<song> • <artist>"
  const m2 = t.split(/\s+[•·]\s+/);
  if (m2.length >= 2) {
    return { title: clean(m2[0]), publishers: splitArtists(m2.slice(1).join(', ')) };
  }

  return { title: t, publishers: [] };
}

async function fetchJsonWithTimeout(url, ms = 4500) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'zenelojatszo/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(to);
  }
}

export async function resolveFromUrl(url) {
  const u = clean(url);
  if (!u) return null;

  if (isYouTube(u)) {
    const api = `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`;
    const j = await fetchJsonWithTimeout(api);
    return {
      sourceType: 'youtube',
      sourceUrl: u,
      title: clean(j.title),
      publishers: splitArtists(j.author_name),
      coverUrl: clean(j.thumbnail_url)
    };
  }

  if (isSpotify(u)) {
    const api = `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`;
    const j = await fetchJsonWithTimeout(api);
    const parsed = parseSpotifyTitle(j.title);
    return {
      sourceType: 'spotify',
      sourceUrl: u,
      title: parsed.title || clean(j.title),
      publishers: parsed.publishers.length ? parsed.publishers : splitArtists(j.author_name),
      coverUrl: clean(j.thumbnail_url)
    };
  }

  return {
    sourceType: 'unknown',
    sourceUrl: u,
    title: '',
    publishers: [],
    coverUrl: ''
  };
}
