let allTracks = [];
let viewTracks = [];
let currentIndex = -1;
let lastJson = "";
let filterMode = "all";

const audio = document.getElementById("audio");

function normalize(s){ return (s||"").toLowerCase().trim(); }

function matchesFilter(t){
  if(filterMode === "mp3") return !!t.audioUrl;
  if(filterMode === "links") return !t.audioUrl && (t.youtubeUrl || t.spotifyUrl);
  return true;
}

function render(){
  const q = normalize(document.getElementById("q").value);
  viewTracks = allTracks
    .filter(matchesFilter)
    .filter(t=>{
      const hay = normalize([t.title, t.artists, t.publisher].join(" "));
      return !q || hay.includes(q);
    });

  document.getElementById("trackCount").textContent = String(allTracks.length);

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  if(viewTracks.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for(const t of viewTracks){
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="cover">
        <img alt="" src="${safeText(t.coverUrl || "")}" onerror="this.style.opacity=.35; this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'><rect width=\'64\' height=\'64\' rx=\'18\' fill=\'%23111b27\'/><text x=\'32\' y=\'38\' text-anchor=\'middle\' fill=\'%2393a4b7\' font-size=\'14\' font-family=\'Arial\'>NO COVER</text></svg>';">
        <div class="playbtn">▶</div>
      </div>
      <div class="meta">
        <p class="title">${safeText(t.title || "Névtelen")}</p>
        <p class="sub">${safeText(t.artists || t.publisher || "—")}</p>
        <div class="badges">
          ${t.audioUrl ? `<span class="badge">MP3</span>` : ``}
          ${t.spotifyUrl ? `<span class="badge">Spotify</span>` : ``}
          ${t.youtubeUrl ? `<span class="badge">YouTube</span>` : ``}
        </div>
      </div>
    `;
    card.addEventListener("click", ()=>{
      const idx = allTracks.findIndex(x=>x.id===t.id);
      playIndex(idx);
    });
    grid.appendChild(card);
  }
}

function setNow(t){
  const cover = document.getElementById("nowCover");
  cover.src = t?.coverUrl || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='%23111b27'/></svg>";
  document.getElementById("nowTitle").textContent = t?.title || "Válassz egy zenét";
  document.getElementById("nowArtist").textContent = t?.artists || t?.publisher || "—";

  const ext = document.getElementById("extLink");
  const link = t?.spotifyUrl || t?.youtubeUrl;
  if(link){
    ext.style.display = "inline-flex";
    ext.href = link;
    ext.textContent = t.spotifyUrl ? "Megnyitás Spotify-ban" : "Megnyitás YouTube-on";
  }else{
    ext.style.display = "none";
    ext.href = "#";
  }
}

function playIndex(idx){
  if(idx < 0 || idx >= allTracks.length) return;
  const t = allTracks[idx];
  currentIndex = idx;
  setNow(t);

  if(t.audioUrl){
    audio.src = t.audioUrl;
    audio.play().catch(()=>{});
    document.getElementById("play").textContent = "⏸️";
  }else{
    audio.pause();
    audio.src = "";
    document.getElementById("play").textContent = "▶️";
    toast("Ez a track csak link (Spotify/YouTube).");
  }
}

function toggle(){
  if(!audio.src){
    if(allTracks.length) playIndex(0);
    return;
  }
  if(audio.paused){
    audio.play().catch(()=>{});
    document.getElementById("play").textContent = "⏸️";
  }else{
    audio.pause();
    document.getElementById("play").textContent = "▶️";
  }
}

function next(){
  if(!allTracks.length) return;
  const n = (currentIndex + 1) % allTracks.length;
  playIndex(n);
}
function prev(){
  if(!allTracks.length) return;
  const n = (currentIndex - 1 + allTracks.length) % allTracks.length;
  playIndex(n);
}

function wire(){
  document.getElementById("q").addEventListener("input", render);

  document.getElementById("play").addEventListener("click", toggle);
  document.getElementById("next").addEventListener("click", next);
  document.getElementById("prev").addEventListener("click", prev);

  const seek = document.getElementById("seek");
  const vol = document.getElementById("vol");
  audio.volume = Number(vol.value)/100;

  vol.addEventListener("input", ()=> audio.volume = Number(vol.value)/100);

  seek.addEventListener("input", ()=>{
    if(!isFinite(audio.duration)) return;
    const p = Number(seek.value)/1000;
    audio.currentTime = p * audio.duration;
  });

  audio.addEventListener("timeupdate", ()=>{
    if(!isFinite(audio.duration)) return;
    document.getElementById("tCur").textContent = fmtTime(audio.currentTime);
    document.getElementById("tDur").textContent = fmtTime(audio.duration);
    seek.value = String(Math.floor((audio.currentTime/audio.duration)*1000));
  });

  audio.addEventListener("ended", next);

  $all(".pill").forEach(p=>{
    p.addEventListener("click", ()=>{
      $all(".pill").forEach(x=>x.classList.remove("active"));
      p.classList.add("active");
      filterMode = p.dataset.filter;
      render();
    });
  });
}

async function loadTracks(showToast=false){
  try{
    const r = await fetch("tracks.json?ts=" + Date.now(), {cache:"no-store"});
    if(!r.ok) throw new Error("tracks.json fetch failed");
    const txt = await r.text();
    if(txt === lastJson) return;
    lastJson = txt;
    const data = JSON.parse(txt);
    allTracks = (data.tracks || []).slice().sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
    document.getElementById("lastSync").textContent = new Date().toLocaleTimeString();

    const curId = allTracks[currentIndex]?.id;
    render();
    if(curId){
      const newIdx = allTracks.findIndex(x=>x.id===curId);
      if(newIdx !== -1) currentIndex = newIdx;
    }
    if(showToast) toast("Frissítve.");
  }catch(e){}
}

wire();
loadTracks();
setInterval(()=>loadTracks(false), 2500);
