let cfg = { owner:"", repo:"", branch:"main", token:"" };
let lib = [];
let saveTimer = null;

const LS_CFG = "zene_cfg_v1";
const LS_DRAFT = "zene_draft_v1";

function setSaveState(s){ document.getElementById("saveState").textContent = s; }
function setCfgHint(s){ document.getElementById("cfgHint").textContent = s; }

function loadCfg(){
  try{ cfg = {...cfg, ...JSON.parse(localStorage.getItem(LS_CFG)||"{}")}; }catch{}
  $("#ghOwner").value = cfg.owner || "";
  $("#ghRepo").value = cfg.repo || "";
  $("#ghBranch").value = cfg.branch || "main";
  $("#ghToken").value = cfg.token || "";
  setCfgHint(cfg.owner && cfg.repo ? "OK" : "Add meg az owner/repo-t.");
}

function saveCfg(){
  cfg.owner = $("#ghOwner").value.trim();
  cfg.repo = $("#ghRepo").value.trim();
  cfg.branch = ($("#ghBranch").value.trim() || "main");
  cfg.token = $("#ghToken").value.trim();
  localStorage.setItem(LS_CFG, JSON.stringify(cfg));
  setCfgHint("Mentve.");
}

function authHeaders(){
  if(!cfg.token) throw new Error("Nincs token beállítva.");
  return {
    "Authorization": "Bearer " + cfg.token,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function friendlyGitHub403(text){
  const t = String(text||"");
  if(t.includes("Resource not accessible by personal access token")){
    return "403 – A token nem fér hozzá a repóhoz. Ellenőrizd: (1) fine‑grained PAT, (2) ennél a tokennél be van pipálva ez a repo (Selected repositories), (3) Repository permissions: Contents = Read and write, (4) ha org/SSO: a tokent Authorize-olni kell az orgnál.";
  }
  return null;
}

async function ghGetJson(path){
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const r = await fetch(url, { headers: authHeaders() });
  if(r.status === 404) return null;
  if(!r.ok) throw new Error("GitHub GET hiba: " + r.status);
  return await r.json();
}

async function ghPutFile(path, contentBase64, message){
  const existing = await ghGetJson(path);
  const body = { message, content: contentBase64, branch: cfg.branch };
  if(existing?.sha) body.sha = existing.sha;

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`;
  const r = await fetch(url, {
    method:"PUT",
    headers: { ...authHeaders(), "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text().catch(()=> "");
    if(r.status === 403){
      const friendly = friendlyGitHub403(t);
      if(friendly) throw new Error(friendly);
    }
    throw new Error("GitHub PUT hiba: " + r.status + " " + t);
  }
  return await r.json();
}

function rawBase(){
  return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/`;
}

function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onerror = ()=>reject(new Error("Fájl olvasási hiba"));
    fr.onload = ()=>{
      const dataUrl = String(fr.result||"");
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    fr.readAsDataURL(file);
  });
}

function b64FromUtf8(str){
  return btoa(unescape(encodeURIComponent(str)));
}
function utf8FromB64(b64){
  return decodeURIComponent(escape(atob(b64)));
}

async function loadLibrary(){
  setSaveState("Betöltés…");
  const j = await ghGetJson("tracks.json");
  if(!j){
    const init = JSON.stringify({version:1, updatedAt:"", tracks:[]}, null, 2);
    await ghPutFile("tracks.json", b64FromUtf8(init), "init tracks.json");
  }
  const jj = await ghGetJson("tracks.json");
  const jsonStr = utf8FromB64(jj.content.replace(/\n/g,""));
  const data = JSON.parse(jsonStr);
  lib = (data.tracks || []);
  $("#libCount").textContent = String(lib.length);
  renderTable();
  setSaveState("Kész");
}

function scheduleSave(reason="autosave"){
  clearTimeout(saveTimer);
  setSaveState("Mentés…");
  saveTimer = setTimeout(()=>saveLibrary(reason), 900);
}

async function saveLibrary(reason="autosave"){
  try{
    const payload = { version: 1, updatedAt: new Date().toISOString(), tracks: lib };
    const json = JSON.stringify(payload, null, 2);
    await ghPutFile("tracks.json", b64FromUtf8(json), `update tracks.json (${reason})`);
    setSaveState("Mentve");
    toast("Könyvtár mentve.");
  }catch(e){
    setSaveState("Hiba");
    toast("Mentési hiba: " + (e?.message || e));
  }
}

function renderTable(){
  const tbody = $("#tbody");
  tbody.innerHTML = "";
  const sorted = lib.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  for(const t of sorted){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div style="font-weight:800">${safeText(t.title||"")}</div>
        <div class="small">${safeText(t.id||"")}</div>
      </td>
      <td>
        <input data-id="${safeText(t.id)}" data-k="artists" value="${safeText(t.artists||"")}" style="width:100%"/>
      </td>
      <td>
        <input data-id="${safeText(t.id)}" data-k="publisher" value="${safeText(t.publisher||"")}" style="width:100%"/>
      </td>
      <td>${t.audioUrl ? "<span class='kbd'>van</span>" : "<span class='small'>nincs</span>"}</td>
      <td><div class="small">${t.spotifyUrl ? "Spotify" : ""} ${t.youtubeUrl ? "YouTube" : ""}</div></td>
      <td>
        <div class="actions">
          ${t.spotifyUrl ? `<a class="btn" href="${safeText(t.spotifyUrl)}" target="_blank">Spotify</a>` : ""}
          ${t.youtubeUrl ? `<a class="btn" href="${safeText(t.youtubeUrl)}" target="_blank">YouTube</a>` : ""}
          <button class="btn danger" data-del="${safeText(t.id)}">Törlés</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  $all("input[data-id][data-k]", tbody).forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.dataset.id;
      const k = inp.dataset.k;
      const t = lib.find(x=>x.id===id);
      if(!t) return;
      t[k] = inp.value;
      scheduleSave("edit");
    });
  });

  $all("button[data-del]", tbody).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.del;
      if(!confirm("Biztos törlöd? (a fájlok a repóban maradhatnak)")) return;
      lib = lib.filter(x=>x.id!==id);
      $("#libCount").textContent = String(lib.length);
      renderTable();
      scheduleSave("delete");
    });
  });
}

function loadDraft(){
  try{
    const d = JSON.parse(localStorage.getItem(LS_DRAFT)||"{}");
    $("#link").value = d.link || "";
    $("#title").value = d.title || "";
    $("#artists").value = d.artists || "";
    $("#publisher").value = d.publisher || "";
    $("#coverLink").value = d.coverLink || "";
  }catch{}
}
function saveDraft(){
  const d = {
    link: $("#link").value.trim(),
    title: $("#title").value.trim(),
    artists: $("#artists").value.trim(),
    publisher: $("#publisher").value.trim(),
    coverLink: $("#coverLink").value.trim()
  };
  localStorage.setItem(LS_DRAFT, JSON.stringify(d));
  $("#addHint").textContent = "Draft mentve.";
}
const saveDraftDebounced = (()=> { let t=null; return ()=>{ clearTimeout(t); t=setTimeout(saveDraft, 250); }; })();

function detectLinkType(url){
  const u = (url||"").trim();
  if(!u) return null;
  if(u.includes("spotify.com")) return "spotify";
  if(u.includes("youtu.be") || u.includes("youtube.com")) return "youtube";
  return "other";
}

async function autofillFromLink(url){
  const type = detectLinkType(url);
  if(type !== "spotify" && type !== "youtube") return;

  $("#addHint").textContent = "Meta lekérés…";
  try{
    let oembed;
    if(type === "spotify"){
      oembed = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    }else{
      oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    }
    const r = await fetch(oembed);
    if(!r.ok) throw new Error("oEmbed hiba");
    const j = await r.json();
    if(!$("#title").value.trim()) $("#title").value = j.title || "";
    const title = String(j.title || "");
    if(!$("#artists").value.trim()){
      const m = title.split(" - ");
      if(m.length >= 2){
        $("#artists").value = m[0].slice(0, 80);
        $("#title").value = m.slice(1).join(" - ").slice(0, 120);
      }
    }
    // Kiadó / előadó (oEmbedből)
    const author = String(j.author_name || "").trim();
    if(author){
      if(!$("#publisher").value.trim()) $("#publisher").value = author;
      if(!$("#artists").value.trim()) $("#artists").value = author;
    }

    // Borító link (oEmbed thumbnail)
    if(j.thumbnail_url){
      if(!$("#coverLink").value.trim()) $("#coverLink").value = j.thumbnail_url;
      document.getElementById("cover").dataset.thumb = j.thumbnail_url;
      $("#addHint").textContent = "Meta kitöltve (cím/előadó/kiadó/borító link).";
    }else{
      $("#addHint").textContent = "Meta kitöltve.";
    }
    toast("Auto kitöltés kész.");
  }catch(e){
    $("#addHint").textContent = "Meta lekérés sikertelen.";
  }
}

function extFromFile(file, fallback){
  const name = (file?.name || "").toLowerCase();
  const m = name.match(/\.([a-z0-9]{2,5})$/);
  if(m) return "." + m[1];
  return fallback;
}

async function addTrack(){
  try{
    saveCfg();
    if(!cfg.owner || !cfg.repo || !cfg.branch) throw new Error("Hiányos GitHub config.");
    if(!cfg.token) throw new Error("Token kell az admin mentéshez.");

    const title = $("#title").value.trim();
    const artists = $("#artists").value.trim();
    const publisher = $("#publisher").value.trim();
    const link = $("#link").value.trim();
    const coverLink = $("#coverLink").value.trim();

    const mp3File = $("#mp3").files?.[0] || null;
    const coverFile = $("#cover").files?.[0] || null;
    const coverThumb = $("#cover").dataset.thumb || "";

    if(!title && !mp3File && !link) throw new Error("Adj meg címet és/vagy mp3-at és/vagy linket.");

    const id = uuid();
    let audioUrl = "";
    let coverUrl = "";

    setSaveState("Feltöltés…");
    $("#addHint").textContent = "Feltöltés…";

    if(mp3File){
      const b64 = await fileToBase64(mp3File);
      const ext = extFromFile(mp3File, ".mp3");
      const path = `track__${id}${ext}`;
      await ghPutFile(path, b64, `add track file ${path}`);
      audioUrl = rawBase() + path;
    }

    if(coverFile){
      const b64 = await fileToBase64(coverFile);
      const ext = extFromFile(coverFile, ".jpg");
      const path = `cover__${id}${ext}`;
      await ghPutFile(path, b64, `add cover file ${path}`);
      coverUrl = rawBase() + path;
    }else if(coverLink){
      coverUrl = coverLink;
    }else if(coverThumb){
      coverUrl = coverThumb;
    }

    const t = {
      id,
      title,
      artists,
      publisher,
      coverUrl,
      audioUrl,
      spotifyUrl: detectLinkType(link)==="spotify" ? link : "",
      youtubeUrl: detectLinkType(link)==="youtube" ? link : "",
      createdAt: Date.now()
    };

    lib.push(t);
    $("#libCount").textContent = String(lib.length);
    renderTable();
    await saveLibrary("add");

    $("#title").value = "";
    $("#artists").value = "";
    $("#publisher").value = "";
    $("#link").value = "";
    $("#coverLink").value = "";
    $("#mp3").value = "";
    $("#cover").value = "";
    $("#cover").dataset.thumb = "";
    localStorage.removeItem(LS_DRAFT);

    $("#addHint").textContent = "Kész. User oldalon pár mp és megjelenik.";
    setSaveState("Mentve");
    toast("Track hozzáadva.");
  }catch(e){
    setSaveState("Hiba");
    $("#addHint").textContent = "Hiba: " + (e?.message || e);
    toast("Hiba: " + (e?.message || e));
  }
}

async function test(){
  try{
    saveCfg();
    if(!cfg.owner || !cfg.repo || !cfg.token) throw new Error("Owner/Repo/Token hiányzik.");
    setSaveState("Teszt…");
    const j = await ghGetJson("tracks.json");
    toast(j ? ("Kapcsolat OK. tracks.json: " + j.sha.slice(0,7)) : "tracks.json nincs még (ok).");
    setSaveState("OK");
  }catch(e){
    setSaveState("Hiba");
    toast("Teszt hiba: " + (e?.message || e));
  }
}

function wire(){
  $("#saveCfg").addEventListener("click", ()=>{ saveCfg(); toast("Config mentve."); });
  $("#testBtn").addEventListener("click", test);
  $("#addTrack").addEventListener("click", addTrack);
  $("#refreshLib").addEventListener("click", ()=>loadLibrary().catch(e=>toast(e.message)));
  $("#forceSave").addEventListener("click", ()=>saveLibrary("force").catch(e=>toast(e.message)));

  $("#wipeDraft").addEventListener("click", ()=>{
    localStorage.removeItem(LS_DRAFT);
    $("#link").value = "";
    $("#title").value = "";
    $("#artists").value = "";
    $("#publisher").value = "";
    $("#coverLink").value = "";
    $("#cover").dataset.thumb = "";
    toast("Draft törölve.");
  });

  ["link","title","artists","publisher","coverLink"].forEach(id=>{
    $("#"+id).addEventListener("input", saveDraftDebounced);
  });

  $("#link").addEventListener("paste", ()=>{
    setTimeout(()=>autofillFromLink($("#link").value.trim()), 0);
  });
  $("#link").addEventListener("input", ()=>{
    const v = $("#link").value.trim();
    if(v.length > 10) autofillFromLink(v);
  });
}

loadCfg();
loadDraft();
wire();

if(cfg.owner && cfg.repo){
  loadLibrary().catch(()=>setSaveState("—"));
} else {
  setSaveState("Config kell");
}
