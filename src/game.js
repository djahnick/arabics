import { getSession } from './services/sessions.js';

// helpers
const qs = (s, el=document) => el.querySelector(s);
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function speakArabic(text){ try{ const u=new SpeechSynthesisUtterance(text); const v=speechSynthesis.getVoices().find(x=>/ar/i.test(x.lang)); if(v) u.voice=v; u.lang=v?.lang||'ar'; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch{} }

// elements
const titleEl=qs('#session-title');
const progressEl=qs('#progress');
const barEl=qs('#progress-bar');
const cardEl=qs('#card');
const cardInner=qs('#card-inner');
const frontEl=qs('#front');
const backEl=qs('#back');
const btnKnown=qs('#btn-known');
const btnUnknown=qs('#btn-unknown');
const resultsBox=qs('#results');
const scoreLine=qs('#score-line');
const btnReplay=qs('#btn-replay');

// state
let words=[]; let order=[]; let idx=0; let score={known:0,unknown:0};

// get session id (URL or fallback localStorage)
const params = new URLSearchParams(location.search);
let sessionId = params.get('session') || (()=>{ try{ return localStorage.getItem('lastSessionId'); }catch{ return null; }})();

if (!sessionId) { alert('Session introuvable'); location.href = './'; throw new Error('No session id'); }

await load();

async function load(){
  const s = await getSession(sessionId);
  if(!s){ alert('Session introuvable'); location.href = './'; return; }
  try { localStorage.setItem('lastSessionId', sessionId); } catch {}
  titleEl.textContent = `🎮 ${s.title || '(sans titre)'}`;
  words = Array.isArray(s.words) ? s.words : [];
  order = shuffle([...Array(words.length).keys()]);
  idx = 0; score = {known:0, unknown:0};
  resultsBox.classList.add('hidden');
  setFlipped(false);

  if (!words.length){
    frontEl.textContent='Aucun mot'; backEl.textContent='';
    btnKnown.disabled = btnUnknown.disabled = true;
    updateProgress(); return;
  }
  btnKnown.disabled = btnUnknown.disabled = false;
  renderCurrent();
}

// UI helpers
function setFlipped(f){ cardInner.classList.toggle('flipped', f); }
function bump(){ cardInner.classList.remove('bump'); void cardInner.offsetWidth; cardInner.classList.add('bump'); }
function renderCurrent(){
  const i = order[idx]; const {ar, fr} = words[i];
  frontEl.textContent = ar || '—'; backEl.textContent = fr || '—';
  setFlipped(false); updateProgress(); bump(); speakArabic(ar);
}
function updateProgress(){
  const total=order.length||0; const current=Math.min(idx+1,total);
  progressEl.textContent = `${current} / ${total}`;
  const pct = total ? Math.round((idx/total)*100) : 0;
  barEl.style.width = `${pct}%`;
}

// interactions
function flipCard(){ setFlipped(!cardInner.classList.contains('flipped')); }
function answer(known){ if(known)score.known++; else score.unknown++; idx++; if(idx>=order.length) return endGame(); renderCurrent(); }
function endGame(){
  btnKnown.disabled = btnUnknown.disabled = true;
  setFlipped(false); updateProgress(); barEl.style.width='100%';
  resultsBox.classList.remove('hidden');
  scoreLine.textContent = `✅ ${score.known} connus — ❌ ${score.unknown} à revoir (total ${order.length})`;
}

// events
cardEl.addEventListener('click', flipCard);
btnKnown.addEventListener('click', ()=>answer(true));
btnUnknown.addEventListener('click', ()=>answer(false));
btnReplay.addEventListener('click', ()=>load());
window.addEventListener('keydown', (e)=>{ if(e.code==='Space'){e.preventDefault();flipCard();} else if(e.code==='ArrowRight'){answer(true);} else if(e.code==='ArrowLeft'){answer(false);} });
window.addEventListener('voiceschanged', ()=>{ if(words.length) speakArabic(words[order[idx]]?.ar); });
