import { requireAuth, getCurrentUser } from './auth.js';
import { getSession } from './services/sessions.js';
import { recordGameResult } from './services/stats.js';

// Auth obligatoire pour jouer
requireAuth();

// helpers
const qs = (s, el=document) => el.querySelector(s);
function shuffle(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function speakArabic(text){
  try{
    const u=new SpeechSynthesisUtterance(text);
    const v=speechSynthesis.getVoices().find(x=>/ar/i.test(x.lang));
    if(v) u.voice=v;
    u.lang=v?.lang||'ar';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch{}
}

// elements
const titleEl    = qs('#session-title');
const progressEl = qs('#progress');
const barEl      = qs('#progress-bar');
const cardEl     = qs('#card');
const cardInner  = qs('#card-inner');
const frontEl    = qs('#front');
const backEl     = qs('#back');
const btnKnown   = qs('#btn-known');
const btnUnknown = qs('#btn-unknown');
const resultsBox = qs('#results');
const scoreLine  = qs('#score-line');
const btnReplay  = qs('#btn-replay');
const errorsBlock     = qs('#errors-block');
const errorsList      = qs('#errors-list');
const btnReplayErrors = qs('#btn-replay-errors');

// state
let words = [];
let order = [];
let idx   = 0;
let score = { known: 0, unknown: 0 };
let answers = [];      // [{ index, known }, ...]
let currentIndex = null;
let modeErrorsOnly = false;

// get session id (URL or fallback localStorage)
const params = new URLSearchParams(location.search);
let sessionId = params.get('session') || (() => {
  try { return localStorage.getItem('lastSessionId'); } catch { return null; }
})();

if (!sessionId) {
  alert('Session introuvable');
  location.href = './';
  throw new Error('No session id');
}

await load();

// Chargement / reset d'une partie complète (mode normal ou erreurs seulement)
async function load(){
  const s = await getSession(sessionId);
  if (!s) {
    alert('Session introuvable');
    location.href = './';
    return;
  }
  try { localStorage.setItem('lastSessionId', sessionId); } catch {}

  titleEl.textContent = `🎮 ${s.title || '(sans titre)'}`;
  words = Array.isArray(s.words) ? s.words : [];

  // Si on rejoue toute la session -> ordre = tous les indices
  order = shuffle([...Array(words.length).keys()]);
  idx = 0;
  score = { known: 0, unknown: 0 };
  answers = [];
  modeErrorsOnly = false;

  resultsBox.classList.add('hidden');
  errorsBlock?.classList.add('hidden');
  if (errorsList) errorsList.innerHTML = '';

  setFlipped(false);

  if (!words.length){
    frontEl.textContent='Aucun mot';
    backEl.textContent='';
    btnKnown.disabled = btnUnknown.disabled = true;
    updateProgress();
    return;
  }
  btnKnown.disabled = btnUnknown.disabled = false;
  renderCurrent();
}

// UI helpers
function setFlipped(f){
  cardInner.classList.toggle('flipped', f);
}
function bump(){
  cardInner.classList.remove('bump');
  void cardInner.offsetWidth;
  cardInner.classList.add('bump');
}
function renderCurrent(){
  const i = order[idx];
  currentIndex = i;
  const { ar, fr } = words[i] || {};
  frontEl.textContent = ar || '—';
  backEl.textContent  = fr || '—';
  setFlipped(false);
  updateProgress();
  bump();
  speakArabic(ar);
}
function updateProgress(){
  const total   = order.length || 0;
  const current = Math.min(idx+1, total);
  progressEl.textContent = `${current} / ${total}`;
  const pct = total ? Math.round((idx/total)*100) : 0;
  barEl.style.width = `${pct}%`;
}

// interactions
function flipCard(){
  setFlipped(!cardInner.classList.contains('flipped'));
}

async function answer(known){
  if (currentIndex == null) return;

  // mémoriser la réponse pour les stats & les erreurs
  answers.push({ index: currentIndex, known });

  if (known) score.known++;
  else       score.unknown++;

  idx++;
  if (idx >= order.length) {
    await endGame();
    return;
  }
  renderCurrent();
}

async function endGame(){
  btnKnown.disabled   = true;
  btnUnknown.disabled = true;
  setFlipped(false);
  updateProgress();
  barEl.style.width='100%';
  resultsBox.classList.remove('hidden');

  const total = order.length;
  scoreLine.textContent = `✅ ${score.known} connus — ❌ ${score.unknown} à revoir (total ${total})`;

  // Affichage des erreurs de cette partie
  const errors = answers.filter(a => !a.known);
  if (errors.length && errorsBlock && errorsList) {
    errorsBlock.classList.remove('hidden');
    errorsList.innerHTML = '';
    const seen = new Set();
    for (const e of errors) {
      const idx = e.index;
      if (seen.has(idx)) continue;
      seen.add(idx);
      const w = words[idx];
      if (!w) continue;
      const li = document.createElement('li');
      li.textContent = `${w.fr || '—'}  —  ${w.ar || '—'}`;
      errorsList.appendChild(li);
    }
  } else if (errorsBlock) {
    errorsBlock.classList.add('hidden');
  }

  // Envoi des stats en base (liées à l'utilisateur courant)
  try {
    const userId = getCurrentUser();
    if (userId && answers.length) {
      await recordGameResult({ userId, sessionId, answers });
    }
  } catch (err) {
    console.error('Erreur enregistrement stats :', err);
  }
}

// Rejouer uniquement les erreurs de la dernière partie
function replayErrorsOnly(){
  const errors = answers.filter(a => !a.known);
  const errorIndices = [...new Set(errors.map(e => e.index))];

  if (!errorIndices.length) {
    alert("Tu n'as aucune erreur à revoir sur cette partie, bravo !");
    return;
  }

  order = shuffle(errorIndices);
  idx = 0;
  score = { known: 0, unknown: 0 };
  answers = [];
  modeErrorsOnly = true;

  resultsBox.classList.add('hidden');
  if (errorsBlock) errorsBlock.classList.add('hidden');
  if (errorsList) errorsList.innerHTML = '';

  btnKnown.disabled   = false;
  btnUnknown.disabled = false;

  renderCurrent();
}

// events
cardEl.addEventListener('click', flipCard);
btnKnown.addEventListener('click', () => { answer(true); });
btnUnknown.addEventListener('click', () => { answer(false); });
btnReplay.addEventListener('click', () => { load(); });
btnReplayErrors?.addEventListener('click', () => { replayErrorsOnly(); });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    flipCard();
  } else if (e.code === 'ArrowRight') {
    answer(true);
  } else if (e.code === 'ArrowLeft') {
    answer(false);
  }
});

window.addEventListener('voiceschanged', () => {
  if (words.length && order.length) {
    const idx0 = order[0];
    speakArabic(words[idx0]?.ar);
  }
});
