(() => {
  const $ = q => document.querySelector(q);

  const ghOwner  = $("#ghOwner");
  const ghRepo   = $("#ghRepo");
  const ghBranch = $("#ghBranch");
  const ghToken  = $("#ghToken");
  const ghStatus = $("#ghStatus");

  const link   = $("#link");
  const title  = $("#title");
  const artist = $("#artist");
  const cover  = $("#cover");
  const audioUrl = $("#audioUrl");

  const btnAdd = $("#btnAdd");
  const btnSave = $("#btnSave");
  const btnTest = $("#btnTest");
  const btnAutofill = $("#btnAutofill");
  const list = $("#list");
  const addStatus = $("#addStatus");

  let tracks = [];
  let tracksSha = null;

  const LS = {
    owner:"md_owner", repo:"md_repo", branch:"md_branch", token:"md_token"
  };

  // --- helpers
  const status = (el,msg)=> el.textContent = msg;

  const cfg = ()=>({
    owner:ghOwner.value.trim(),
    repo:ghRepo.value.trim(),
    branch:ghBranch.value.trim()||"main",
    token:ghToken.value.trim()
  });

  // --- load/save creds
  Object.keys(LS).forEach(k=>{
    const el = {owner:ghOwner,repo:ghRepo,branch:ghBranch,token:ghToken}[k];
    el.value = localStorage.getItem(LS[k]) || el.value || "";
    el.addEventListener("change",()=>localStorage.setItem(LS[k],el.value));
  });

  // --- oEmbed
  async function autofill(){
    if(!link.value) return;
    let url;
    if(link.value.includes("spotify")){
      url=`https://open.spotify.com/oembed?url=${encodeURIComponent(link.value)}`;
    }else if(link.value.includes("youtu")){
      url=`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.value)}`;
    }else return;

    const r = await fetch(url);
    const j = await r.json();
    title.value  ||= j.title || "";
    artist.value ||= j.author_name || "";
    cover.value  ||= j.thumbnail_url || "";
  }

  btnAutofill.onclick = autofill;

  // --- add track
  btnAdd.onclick = ()=>{
    if(!audioUrl.value){
      status(addStatus,"Audio útvonal kötelező");
      return;
    }
    tracks.push({
      id: crypto.randomUUID(),
      title: title.value,
      artist: artist.value,
      cover: cover.value,
      file: audioUrl.value,
      sourceUrl: link.value
    });
    render();
    status(addStatus,"Hozzáadva");
  };

  function render(){
    list.innerHTML="";
    tracks.forEach((t,i)=>{
      const d=document.createElement("div");
      d.textContent=`${t.artist} – ${t.title} (${t.file})`;
      list.appendChild(d);
    });
  }

  // --- GitHub
  async function loadTracks(){
    try{
      const c=cfg();
      const r=await GH.getTextFile({...c,path:"data/tracks.json"});
      tracks = JSON.parse(r.text||"[]");
      tracksSha = r.sha;
      render();
    }catch{
      tracks=[];
      render();
    }
  }

  async function saveTracks(){
    const c=cfg();
    await GH.putTextFile({
      ...c,
      path:"data/tracks.json",
      sha:tracksSha,
      text:JSON.stringify(tracks,null,2),
      message:"Update tracks"
    });
    status(ghStatus,"Mentve GitHubra");
  }

  btnSave.onclick = saveTracks;
  btnTest.onclick = async()=>{
    try{
      await GH.testRepo(cfg());
      status(ghStatus,"Kapcsolat OK");
      await loadTracks();
    }catch(e){
      status(ghStatus,"Hiba: "+e.message);
    }
  };

})();
