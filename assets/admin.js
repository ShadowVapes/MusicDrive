/* MusicDrive – admin (works even without GitHub: local draft save) */
(() => {
  const $ = (q, el=document) => el.querySelector(q);

  const ghOwner = $("#ghOwner");
  const ghRepo = $("#ghRepo");
  const ghBranch = $("#ghBranch");
  const ghToken = $("#ghToken");
  const btnTest = $("#btnTest");
  const ghStatus = $("#ghStatus");

  const link = $("#link");
  const title = $("#title");
  const artist = $("#artist");
  const cover = $("#cover");
  const audioUrl = $("#audioUrl");
  const file = $("#file");

  const btnAutofill = $("#btnAutofill");
  const btnAdd = $("#btnAdd");
  const addStatus = $("#addStatus");

  const list = $("#list");
  const btnSave = $("#btnSave");

  const LS = {
    owner: "md_owner",
    repo: "md_repo",
    branch: "md_branch",
    token: "md_token",
    draft: "md_tracks_draft"
  };

  let tracks = [];
  let shaTracks = null;

  function setStatus(el, msg, tone="muted") {
    if (!el) return;
    el.textContent = msg;
    el.style.color =
      tone === "good" ? "var(--good)" :
      tone === "bad" ? "var(--bad)" :
      tone === "warn" ? "var(--warn)" : "var(--muted)";
  }

  function loadCreds() {
    ghOwner.value = localStorage.getItem(LS.owner) || "";
    ghRepo.value = localStorage.getItem(LS.repo) || "";
    ghBranch.value = localStorage.getItem(LS.branch) || "main";
    ghToken.value = localStorage.getItem(LS.token) || "";
  }
  function saveCreds() {
    localStorage.setItem(LS.owner, (ghOwner.value||"").trim());
    localStorage.setItem(LS.repo, (ghRepo.value||"").trim());
    localStorage.setItem(LS.branch, (ghBranch.value||"").trim() || "main");
    localStorage.setItem(LS.token, (ghToken.value||"").trim());
  }

  function cfg() {
    return {
      owner: (ghOwner.value||"").trim(),
      repo: (ghRepo.value||"").trim(),
      branch: (ghBranch.value||"").trim() || "main",
      token: (ghToken.value||"").trim()
    };
  }

  function hasGitHubCfg() {
    const c = cfg();
    return !!(c.owner && c.repo && c.branch && c.token);
  }

  function normalizeSource(u) {
    const s = (u||"").toLowerCase();
    if (s.includes("youtube.com") || s.includes("youtu.be")) return "youtube";
    if (s.includes("spotify.com")) return "spotify";
    return "local";
  }

  async function oembed(url) {
    const src = normalizeSource(url);
    if (src === "youtube") {
      const api = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(api);
      if (!res.ok) throw new Error("YouTube meta nem elérhető");
      const j = await res.json();
      return { title: j.title, artist: j.author_name, cover: j.thumbnail_url, source: "youtube", original: url };
    }
    if (src === "spotify") {
      const api = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await fetch(api);
      if (!res.ok) throw new Error("Spotify meta nem elérhető");
      const j = await res.json();
      const parsed = parseSpotifyTitle(j.title);
      return { title: parsed.title, artist: parsed.artist, cover: j.thumbnail_url, source: "spotify", original: url };
    }
    throw new Error("Csak YouTube/Spotify link");
  }

  function parseSpotifyTitle(t) {
    const s = (t||"").trim();
    const dot = s.split("•").map(x=>x.trim());
    if (dot.length === 2) return { title: dot[0], artist: dot[1] };
    const dash = s.split(" - ").map(x=>x.trim());
    if (dash.length >= 2) return { title: dash[0], artist: dash.slice(1).join(" - ") };
    return { title: s, artist: "" };
  }

  function makeId() {
    return "t_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function sanitizeFilename(name) {
    return (name || "track")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i,"")
      .replace(/[^a-z0-9\-_]+/g,"-")
      .replace(/-+/g,"-")
      .replace(/^-|-$/g,"")
      .slice(0, 60) || "track";
  }

  function escapeHtml(s){
    return (s ?? "").toString()
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function loadDraft() {
    try{
      const raw = localStorage.getItem(LS.draft);
      if (!raw) return;
      const j = JSON.parse(raw);
      if (Array.isArray(j)) tracks = j;
    }catch(_){}
  }
  function saveDraft() { localStorage.setItem(LS.draft, JSON.stringify(tracks)); }

  async function loadTracksFromGitHub() {
    const c = cfg();
    try{
      const {text, sha} = await GH.getTextFile({ ...c, path:"data/tracks.json" });
      shaTracks = sha;
      tracks = [];
      if (text.trim()) {
        const j = JSON.parse(text);
        tracks = Array.isArray(j) ? j : (j.tracks || []);
      }
      saveDraft();
      renderList();
      setStatus(ghStatus, `Betöltve GitHubról: ${tracks.length} track`, "good");
    }catch(e){
      if (e.status === 404) {
        shaTracks = null;
        renderList();
        setStatus(ghStatus, "tracks.json még nincs (404) — csinálunk újat mentésnél", "warn");
      } else {
        setStatus(ghStatus, "Betöltés hiba: " + e.message, "bad");
      }
    }
  }

  function renderList() {
    list.innerHTML = "";
    if (!tracks.length) {
      list.innerHTML = `<div style="color:var(--muted);font-size:13px">Még nincs track. Adj hozzá fent.</div>`;
      return;
    }
    tracks.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "item";
      const img = t.cover || "assets/cover-fallback.png";
      row.innerHTML = `
        <img src="${img}" alt="">
        <div class="itemMeta">
          <div class="itemTitle">${escapeHtml(t.title || "Ismeretlen cím")}</div>
          <div class="itemSub">${escapeHtml(t.artist || "Ismeretlen előadó")} • <span style="opacity:.8">${escapeHtml(t.source||"local")}</span></div>
          <div class="itemSub" style="opacity:.85">${escapeHtml(t.file || "")}</div>
        </div>
        <div class="itemBtns">
          <button class="mini" data-act="up">↑</button>
          <button class="mini" data-act="down">↓</button>
          <button class="mini danger" data-act="del">Törlés</button>
        </div>
      `;
      row.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.act;
          if (act === "del") tracks.splice(i,1);
          if (act === "up" && i > 0) { const tmp = tracks[i-1]; tracks[i-1]=tracks[i]; tracks[i]=tmp; }
          if (act === "down" && i < tracks.length-1) { const tmp = tracks[i+1]; tracks[i+1]=tracks[i]; tracks[i]=tmp; }
          saveDraft();
          renderList();
        });
      });
      list.appendChild(row);
    });
  }

  async function autofillFromLink() {
    const u = (link.value||"").trim();
    if (!u) return setStatus(addStatus, "Adj meg egy linket.", "warn");
    try{
      setStatus(addStatus, "Meta lekérés...", "muted");
      const meta = await oembed(u);
      title.value = meta.title || "";
      artist.value = meta.artist || "";
      cover.value = meta.cover || "";
      setStatus(addStatus, `Kész: ${meta.source}`, "good");
    }catch(e){
      setStatus(addStatus, "Meta hiba: " + e.message, "bad");
    }
  }

  function resetForm() { link.value=""; title.value=""; artist.value=""; cover.value=""; audioUrl.value=""; file.value=""; }

  btnAdd.addEventListener("click", async () => {
    try{
      const f = file.files && file.files[0];
      const urlIn = (audioUrl.value||"").trim();
      if (!f && !urlIn) return setStatus(addStatus, "Adj meg audio útvonalat/linket, vagy válassz fájlt.", "warn");

      if ((link.value||"").trim() && !title.value.trim() && !artist.value.trim() && !cover.value.trim()) {
        await autofillFromLink();
      }

      const t = {
        id: makeId(),
        title: title.value.trim(),
        artist: artist.value.trim(),
        cover: cover.value.trim(),
        source: normalizeSource((link.value||"").trim() || "local"),
        sourceUrl: (link.value||"").trim() || "",
        createdAt: Date.now(),
        file: ""
      };

      if (urlIn){
      t.file = urlIn;
    } else {
      const ext = (f.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase() || ".mp3";
      const base = sanitizeFilename(`${t.artist}-${t.title}`.replace(/^-/,"").replace(/-$/,""));
      const fname = `${base || "track"}_${Date.now()}${ext}`;
      t.file = `audio/${fname}`;
    }

      if (!t.title) t.title = (f ? f.name.replace(/\.[^.]+$/,"") : (t.file.split("/").pop()||"")).replace(/\.[^.]+$/,"");(/\.[^.]+$/,"");
      if (!t.artist) t.artist = "Unknown";

      if (f && !urlIn) t._pendingFile = f; // session only

      tracks.unshift(t);
      saveDraft();
      renderList();
      setStatus(addStatus, "OK. Mentés gomb, és kész.", "good");
      resetForm();
    }catch(e){
      console.error(e);
      setStatus(addStatus, "Hiba: " + e.message, "bad");
    }
  });

  btnAutofill.addEventListener("click", autofillFromLink);

  async function uploadPendingAudio() {
    const c = cfg();
    for (const t of tracks) {
      if (!t._pendingFile) continue;
      // GitHub Contents API size limit is tight; keep this for small files only.
      if (t._pendingFile.size > 900000) {
        throw new Error(`A(z) ${t._pendingFile.name} túl nagy a böngészős GitHub feltöltéshez. Tedd fel git push-sal a repo audio/ mappájába, és az adminban csak az útvonalat add meg.`);
      }
      const path = t.file;

      const buf = await t._pendingFile.arrayBuffer();
      const bytes = new Uint8Array(buf);

      let existingSha = null;
      try{
        const existing = await GH.getFile({ ...c, path });
        existingSha = existing?.sha || null;
      }catch(e){
        if (e.status !== 404) throw e;
      }

      await GH.putBinaryFile({
        ...c, path, sha: existingSha, bytes,
        message: existingSha ? `Replace ${path}` : `Upload ${path}`
      });

      delete t._pendingFile;
    }
  }

  async function saveAll() {
    saveCreds();
    saveDraft();

    if (!hasGitHubCfg()) {
      setStatus(ghStatus, "Local mentés OK (nincs GitHub token).", "warn");
      return;
    }

    const c = cfg();
    try{
      setStatus(ghStatus, "GitHub mentés...", "muted");

      await uploadPendingAudio();

      const out = JSON.stringify(tracks.map(t => {
        const x = {...t};
        delete x._pendingFile;
        return x;
      }), null, 2);

      const res = await GH.putTextFile({
        ...c,
        path:"data/tracks.json",
        text: out,
        sha: shaTracks,
        message: "Update tracks.json"
      });

      shaTracks = res?.content?.sha || shaTracks;
      setStatus(ghStatus, "Mentve GitHubra ✅", "good");
    }catch(e){
      console.error(e);
      setStatus(ghStatus, "Mentés hiba: " + e.message, "bad");
    }
  }

  btnSave.addEventListener("click", saveAll);

  btnTest.addEventListener("click", async () => {
    try{
      saveCreds();
      const c = cfg();
      setStatus(ghStatus, "Teszt...", "muted");
      await GH.testRepo(c);
      setStatus(ghStatus, "Kapcsolat OK ✅", "good");
      await loadTracksFromGitHub();
    }catch(e){
      console.error(e);
      setStatus(ghStatus, "Teszt hiba: " + e.message, "bad");
    }
  });

  [ghOwner, ghRepo, ghBranch, ghToken].forEach(inp => inp.addEventListener("change", saveCreds));

  // Boot
  try{
    loadCreds();
    loadDraft();
    renderList();
    if (ghOwner.value && ghRepo.value && ghToken.value) loadTracksFromGitHub();
    setStatus(addStatus, "—", "muted");
    setStatus(ghStatus, "—", "muted");
  }catch(e){
    console.error(e);
    alert("Admin init hiba: " + e.message);
  }
})();
