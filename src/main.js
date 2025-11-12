import { listSessions, createSession, removeSession } from './services/sessions.js';
import { SessionItem } from './ui/components.js';
import { qs, el, toast } from './ui/dom.js';
import { downloadJson, readFileAsText } from './utils/helpers.js';

const ul = document.getElementById('sessions');
const form = document.getElementById('session-form');
const titleEl = document.getElementById('title');
const wordsEl = document.getElementById('words');
const exportAllBtn = document.getElementById('export-all');
const importInput = document.getElementById('import-file');

async function render() {
  ul.innerHTML = '';
  const sessions = await listSessions();
  if (!sessions.length) {
    ul.append(el('li', {}, 'Aucune session encore.'));
    return;
  }
  sessions.forEach(s => {
    ul.append(SessionItem({
      id: s.id,
      title: s.title || '(sans titre)',
      wordsCount: Array.isArray(s.words) ? s.words.length : 0,
      onDelete: async (id) => {
        if (!confirm('Supprimer cette session ?')) return;
        await removeSession(id);
        await render();
      },
      onExport: (id) => downloadJson(s, `${(s.title||'session').replace(/\s+/g,'_')}.json`)
    }));
  });
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const title = titleEl.value.trim();
    const words = JSON.parse(wordsEl.value.trim());
    await createSession({ title, words });
    form.reset();
    toast('Session ajoutée !');
    await render();
  } catch (e) {
    console.error(e);
    toast('Erreur : JSON invalide.');
  }
});

exportAllBtn?.addEventListener('click', async () => {
  const sessions = await listSessions();
  downloadJson(sessions, 'mes_sessions.json');
});

importInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const txt = await readFileAsText(file);
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) throw new Error('Format attendu: tableau de sessions');
    for (const s of arr) {
      if (!s.title || !Array.isArray(s.words)) continue;
      await createSession({ title: s.title, words: s.words });
    }
    toast('Import terminé ✔️');
    await render();
  } catch (err) {
    console.error(err);
    toast('Import raté : JSON invalide.');
  } finally {
    e.target.value = '';
  }
});

render();
