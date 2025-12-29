function $(sel, el=document){ return el.querySelector(sel); }
function $all(sel, el=document){ return [...el.querySelectorAll(sel)]; }

function toast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> t.classList.remove('show'), 2600);
}

function fmtTime(s){
  if(!isFinite(s)) return "0:00";
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s/60);
  const r = s%60;
  return m + ":" + String(r).padStart(2,"0");
}

function safeText(x){
  return String(x ?? "").replace(/[<>]/g, "");
}

function uuid(){
  return (crypto?.randomUUID?.() || (Date.now().toString(16)+Math.random().toString(16).slice(2))).replace(/-/g,"").slice(0,12);
}
