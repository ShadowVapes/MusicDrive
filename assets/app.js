/* MusicDrive – user app (no build tools) */
(() => {
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => [...el.querySelectorAll(q)];

  const audio = $("#audio");
  const grid = $("#grid");
  const statCount = $("#statCount");
  const statTotal = $("#statTotal");

  const player = $("#player");
  const pCover = $("#pCover");
  const pTitle = $("#pTitle");
  const pArtist = $("#pArtist");
  const pPlay = $("#pPlay");
  const pPrev = $("#pPrev");
  const pNext = $("#pNext");
  const pSeek = $("#pSeek");
  const pCur = $("#pCur");
  const pDur = $("#pDur");
  const pVol = $("#pVol");
  const pShuffle = $("#pShuffle");
  const pLoop = $("#pLoop");

  const search = $("#search");
  const btnRefresh = $("#btnRefresh");

  let tracks = [];
  let view = [];
  let idx = -1;

  const state = {
    filter: "all",
    q: "",
    shuffle: false,
    loop: false,
  };

  const fmtTime = (sec) => {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2,"0")}`;
  };

  const safeText = (s) => (s ?? "").toString();

  const pickBadge = (t) => {
    const src = (t.source || "").toLowerCase();
    if (src.includes("youtube")) return "YouTube";
    if (src.includes("spotify")) return "Spotify";
    return "Local";
  };

  function setFilterButtons() {
    $$(".seg").forEach(b => b.classList.toggle("active", b.dataset.filter === state.filter));
  }

  function applyView() {
    const q = state.q.trim().toLowerCase();
    view = tracks.filter(t => {
      const src = (t.source||"").toLowerCase();
      if (state.filter !== "all" && !src.includes(state.filter)) return false;
      if (!q) return true;
      const hay = `${t.title||""} ${t.artist||""} ${t.source||""}`.toLowerCase();
      return hay.includes(q);
    });
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = "";
    if (!view.length) {
      const empty = document.createElement("div");
      empty.className = "panel subtle";
      empty.innerHTML = `
        <h2 style="margin:0 0 8px">Nincs találat</h2>
        <div style="color:var(--muted);font-size:13px;line-height:1.4">
          Ha még nincs zenéd: admin → tölts fel egy audio fájlt és mentsd.
        </div>`;
      grid.appendChild(empty);
      return;
    }

    view.forEach((t, i) => {
      const card = document.createElement("div");
      card.className = "card";
      const badge = pickBadge(t);
      const cover = t.cover || "assets/cover-fallback.png";
      card.innerHTML = `
        <div class="coverWrap">
          <img class="cover" src="${cover}" alt="">
          <div class="badge">${badge}</div>
        </div>
        <div class="meta">
          <p class="title">${safeText(t.title) || "Ismeretlen cím"}</p>
          <div class="artist">${safeText(t.artist) || "Ismeretlen előadó"}</div>
          <div class="smallRow">
            <span>${safeText(t.durationLabel||"")}</span>
            <span class="kbd">Enter</span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => playFromView(i));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter") playFromView(i);
      });
      card.tabIndex = 0;
      grid.appendChild(card);
    });
  }

  function currentTrack() {
    if (idx < 0) return null;
    return view[idx] || null;
  }

  function playFromView(i) {
    if (i < 0 || i >= view.length) return;
    idx = i;
    loadAndPlay(view[idx]);
  }

  function loadAndPlay(t) {
    if (!t) return;
    const src = t.file || "";
    if (!src) return;

    player.classList.remove("hidden");

    pCover.src = t.cover || "assets/cover-fallback.png";
    pCover.alt = (t.title || "cover");
    pTitle.textContent = t.title || "—";
    pArtist.textContent = t.artist || "—";

    audio.src = src;
    audio.play().catch(()=>{});
    updatePlayButton();
  }

  function updatePlayButton() {
    pPlay.textContent = audio.paused ? "▶" : "⏸";
  }

  function nextTrack(step=1) {
    if (!view.length) return;
    if (state.shuffle) {
      const next = Math.floor(Math.random() * view.length);
      idx = next;
      loadAndPlay(view[idx]);
      return;
    }
    idx = (idx + step) % view.length;
    if (idx < 0) idx = view.length - 1;
    loadAndPlay(view[idx]);
  }

  // Stats: compute durations by loading metadata lightweight
  async function computeDurations(list) {
    let total = 0;
    for (const t of list) {
      if (t.durationSec && isFinite(t.durationSec)) {
        total += t.durationSec;
        continue;
      }
      // try to fetch metadata by creating temp audio
      try{
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.src = t.file;
        await new Promise((res, rej) => {
          const cleanup = () => {
            a.removeEventListener("loadedmetadata", onOk);
            a.removeEventListener("error", onErr);
          };
          const onOk = () => { cleanup(); res(); };
          const onErr = () => { cleanup(); rej(new Error("meta fail")); };
          a.addEventListener("loadedmetadata", onOk, {once:true});
          a.addEventListener("error", onErr, {once:true});
        });
        t.durationSec = a.duration;
        t.durationLabel = fmtTime(a.duration);
        total += a.duration;
      }catch(_){
        t.durationLabel = t.durationLabel || "";
      }
    }
    statCount.textContent = String(list.length);
    statTotal.textContent = total ? fmtTime(total) : "—";
  }

  async function loadTracks() {
    const res = await fetch(`data/tracks.json?v=${Date.now()}`, {cache:"no-store"});
    if (!res.ok) throw new Error("tracks.json nem olvasható");
    const data = await res.json();
    tracks = Array.isArray(data) ? data : (data.tracks || []);
    // newest first (optional)
    tracks.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    await computeDurations(tracks);
    applyView();
  }

  // Player wiring
  pPlay.addEventListener("click", () => {
    if (!currentTrack()) {
      if (view.length) playFromView(0);
      return;
    }
    if (audio.paused) audio.play().catch(()=>{});
    else audio.pause();
    updatePlayButton();
  });
  pPrev.addEventListener("click", () => nextTrack(-1));
  pNext.addEventListener("click", () => nextTrack(1));

  pSeek.addEventListener("input", () => {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const p = Number(pSeek.value) / 1000;
    audio.currentTime = p * audio.duration;
  });

  audio.addEventListener("timeupdate", () => {
    pCur.textContent = fmtTime(audio.currentTime);
    if (isFinite(audio.duration) && audio.duration > 0) {
      pDur.textContent = fmtTime(audio.duration);
      pSeek.value = String(Math.floor((audio.currentTime / audio.duration) * 1000));
    }
  });
  audio.addEventListener("play", updatePlayButton);
  audio.addEventListener("pause", updatePlayButton);

  audio.addEventListener("ended", () => {
    if (state.loop) {
      audio.currentTime = 0;
      audio.play().catch(()=>{});
    } else {
      nextTrack(1);
    }
  });

  pVol.addEventListener("input", () => {
    audio.volume = Number(pVol.value);
  });
  audio.volume = Number(pVol.value);

  pShuffle.addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    pShuffle.classList.toggle("on", state.shuffle);
  });
  pLoop.addEventListener("click", () => {
    state.loop = !state.loop;
    pLoop.classList.toggle("on", state.loop);
  });

  // Search + filters
  search.addEventListener("input", () => {
    state.q = search.value;
    applyView();
  });
  $$(".seg").forEach(btn => {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      setFilterButtons();
      applyView();
    });
  });
  setFilterButtons();

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (e.key === " ") { e.preventDefault(); pPlay.click(); }
    if (e.key === "ArrowRight") nextTrack(1);
    if (e.key === "ArrowLeft") nextTrack(-1);
  });

  btnRefresh.addEventListener("click", () => loadTracks().catch(err => alert(err.message)));

  // Boot
  loadTracks().catch(err => {
    console.error(err);
    alert("Betöltés hiba: " + err.message);
  });
})();
