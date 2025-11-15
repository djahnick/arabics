import { requireAuth, getCurrentUser } from './auth.js';
import { getSession } from './services/sessions.js';
import { recordGameResult } from './services/stats.js';

// Auth obligatoire pour jouer
requireAuth();

// helpers
const qs = (s, el=document) => el.querySelector(s);
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function speakArabic(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    const v = speechSynthesis.getVoices().find(x=>/ar/i.test(x.lang));
    if(v) u.voice = v;
    u.lang = v?.lang || 'ar';
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
const btnReplayErrors = qs('#btn-replay-errors');
const btnBack    = qs('#btn-back');
const btnHome    = qs('#btn-home');
const errorsContainer = qs('#errors-container');
const errorsListEl    = qs('#errors-list');
const modeArFrBtn = qs('#mode-ar-fr');
const modeFrArBtn = qs('#mode-fr-ar');

// state
let mode = 'ar-fr';        // 'ar-fr' ou 'fr-ar'
let sessionWords = [];     // tous les mots de la session d'origine
let words        = [];     // mots utilisés dans la partie (tous ou seulement erreurs)
let wordIndexes  = [];     // pour chaque entrée de "words", index original dans sessionWords
let order        = [];
let idx          = 0;
let score        = { known: 0, unknown: 0 };
let errorsIndexes = [];       // erreurs de la PARTIE en cours (index originaux)
let lastErrorsToReplay = [];  // erreurs de la DERNIÈRE partie (pour le bouton "rejouer ces mots")
let answers      = [];        // [{ index: <index original>, known: true/false }, ...]

// get session id (URL ou fallback localStorage)
const params = new URLSearchParams(location.search);
let sessionId = params.get('session') || (() => {
  try{ return localStorage.getItem('lastSessionId'); }
  catch{ return null; }
})();

if (!sessionId) {
  alert('Session introuvable');
  location.href = './';
  throw new Error('No session id');
}

// ---- NAVIGATION ----
function goBackToApp() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = './';
  }
}

// ---- MODE ----
function updateModeUI() {
  modeArFrBtn?.classList.toggle('mode-active', mode === 'ar-fr');
  modeFrArBtn?.classList.toggle('mode-active', mode === 'fr-ar');
}

function setMode(newMode) {
  if (mode === newMode) return;
  mode = newMode;
  updateModeUI();
  // on relance une partie complète dans le nouveau sens
  load(false);
}

// ---- LOAD SESSION ----
async function load(useErrorsOnly = false){
  const s = await getSession(sessionId);
  if(!s){
    alert('Session introuvable');
    location.href = './';
    return;
  }
  try { localStorage.setItem('lastSessionId', sessionId); } catch {}

  titleEl.textContent = `🎮 ${s.title || '(sans titre)'}`;
  sessionWords = Array.isArray(s.words) ? s.words : [];

  // reset état de la nouvelle partie
  answers       = [];
  score         = { known: 0, unknown: 0 };
  errorsIndexes = [];
  resultsBox.classList.add('hidden');
  btnReplayErrors?.classList.add('hidden');
  if (errorsContainer) errorsContainer.classList.add('hidden');
  if (errorsListEl) errorsListEl.innerHTML = '';

  if (useErrorsOnly && lastErrorsToReplay.length) {
    // Rejouer uniquement les erreurs de la partie précédente
    wordIndexes = lastErrorsToReplay.slice();
    words = wordIndexes
      .map(i => sessionWords[i])
      .filter(Boolean);
  } else {
    // Rejouer toute la session
    wordIndexes = sessionWords.map((_, idx) => idx);
    words = sessionWords;
  }

  order = shuffle([...Array(words.length).keys()]);
  idx = 0;

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
  const localIdx = order[idx];
  const w = words[localIdx] || {};
  const { ar, fr } = w;

  let question, answer;
  if (mode === 'ar-fr') {
    question = ar;
    answer   = fr;
  } else {
    question = fr;
    answer   = ar;
  }

  frontEl.textContent = question || '—';
  backEl.textContent  = answer   || '—';
  setFlipped(false);
  updateProgress();
  bump();

  // On lit toujours la version arabe pour l'oreille
  if (ar) speakArabic(ar);
}
function updateProgress(){
  const total   = order.length || 0;
  const current = Math.min(idx+1,total);
  progressEl.textContent = `${current} / ${total}`;
  const pct = total ? Math.round((idx/total)*100) : 0;
  barEl.style.width = `${pct}%`;
}

// interactions
function flipCard(){
  setFlipped(!cardInner.classList.contains('flipped'));
}

function answer(known){
  const localIdx      = order[idx];
  const originalIndex = wordIndexes[localIdx];

  // enregistrer la réponse pour les stats
  if (typeof originalIndex === 'number') {
    answers.push({ index: originalIndex, known });
  }

  if (known) {
    score.known++;
  } else {
    score.unknown++;
    if (typeof originalIndex === 'number' && !errorsIndexes.includes(originalIndex)) {
      errorsIndexes.push(originalIndex);
    }
  }

  idx++;
  if(idx>=order.length) return endGame();
  renderCurrent();
}

async function endGame(){
  btnKnown.disabled = btnUnknown.disabled = true;
  setFlipped(false);
  updateProgress();
  barEl.style.width='100%';
  resultsBox.classList.remove('hidden');

  const total = order.length;
  scoreLine.textContent = `✅ ${score.known} connus — ❌ ${score.unknown} à revoir (total ${total})`;

  // Erreurs de cette partie = ce qu'on proposera pour "rejouer seulement ces mots"
  lastErrorsToReplay = errorsIndexes.slice();

  // Affichage du bouton "rejouer seulement ces mots"
  if (errorsIndexes.length) {
    btnReplayErrors?.classList.remove('hidden');
  } else {
    btnReplayErrors?.classList.add('hidden');
  }

  // Afficher la liste des erreurs
  if (errorsListEl) errorsListEl.innerHTML = '';
  if (errorsIndexes.length && errorsContainer && errorsListEl) {
    errorsContainer.classList.remove('hidden');
    for (const originalIndex of errorsIndexes) {
      const w = sessionWords[originalIndex];
      if (!w) continue;
      const li = document.createElement('li');
      li.textContent = `${w.fr || '—'} — ${w.ar || '—'}`;
      errorsListEl.appendChild(li);
    }
  } else if (errorsContainer) {
    errorsContainer.classList.add('hidden');
  }

  // ---- Enregistrer les stats en base ----
  try {
    const userId = getCurrentUser();
    if (userId && answers.length) {
      await recordGameResult({
        userId,
        sessionId,
        answers
      });
    }
  } catch (err) {
    console.error('Erreur enregistrement stats', err);
  }
}

// events
cardEl.addEventListener('click', flipCard);
btnKnown.addEventListener('click', ()=>answer(true));
btnUnknown.addEventListener('click', ()=>answer(false));
btnReplay.addEventListener('click', ()=>load(false));
btnReplayErrors?.addEventListener('click', ()=>load(true));

// Retour & Accueil
btnBack?.addEventListener('click', goBackToApp);
btnHome?.addEventListener('click', goBackToApp);

// Changement de mode
modeArFrBtn?.addEventListener('click', () => setMode('ar-fr'));
modeFrArBtn?.addEventListener('click', () => setMode('fr-ar'));

window.addEventListener('keydown', (e)=>{
  if(e.code==='Space'){
    e.preventDefault();
    flipCard();
  } else if(e.code==='ArrowRight'){
    answer(true);
  } else if(e.code==='ArrowLeft'){
    answer(false);
  }
});
window.addEventListener('voiceschanged', ()=>{
  if(words.length) {
    const w = words[order[idx]];
    if (w?.ar) speakArabic(w.ar);
  }
});

// ---- INIT ----
updateModeUI();
load(false);
