import { listCourses, createCourse, removeCourse } from './services/courses.js';
import { listSessionsByCourse, createSession, removeSession } from './services/sessions.js';
import { CourseItem, SessionItem } from './ui/components.js';
import { qs, el, toast } from './ui/dom.js';
import { downloadJson, readFileAsText } from './utils/helpers.js';
import { requireAuth, getCurrentUser, clearCurrentUser } from './auth.js';

// Auth obligatoire
requireAuth();
const currentUser = getCurrentUser();
const currentUserEl = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout');
if (currentUserEl) currentUserEl.textContent = `Connecté : ${currentUser}`;
logoutBtn?.addEventListener('click', () => {
  clearCurrentUser();
  window.location.href = './login.html';
});

// Vues
const coursesView = document.getElementById('courses-view');
const sessionsView = document.getElementById('sessions-view');

// Cours
const coursesListEl = document.getElementById('courses-list');
const courseForm = document.getElementById('course-form');
const courseTitleEl = document.getElementById('course-title');

// Sessions
const backBtn = document.getElementById('back-to-courses');
const currentCourseTitleEl = document.getElementById('current-course-title');
const sessionsListEl = document.getElementById('sessions');
const sessionForm = document.getElementById('session-form');
const titleEl = document.getElementById('title');
const wordsEl = document.getElementById('words');
const exportAllBtn = document.getElementById('export-all');
const importInput = document.getElementById('import-file');

let currentCourse = null;

// ---- RENDERS ----
async function renderCourses() {
  currentCourse = null;
  coursesView.classList.remove('hidden');
  sessionsView.classList.add('hidden');

  coursesListEl.innerHTML = '';
  const courses = await listCourses();
  if (!courses.length) {
    coursesListEl.append(el('li', {}, "Aucun cours pour l'instant."));
    return;
  }
  courses.forEach(c => {
    coursesListEl.append(
      CourseItem({
        id: c.id,
        title: c.title || '(cours sans titre)',
        onOpen: async (id) => {
          currentCourse = courses.find(x => x.id === id) || { id, title: '(cours)' };
          await renderSessions();
        },
        onDelete: async (id) => {
          if (!confirm("Supprimer ce cours et toutes ses sessions ?")) return;
          await removeCourse(id);
          await renderCourses();
        }
      })
    );
  });
}

async function renderSessions() {
  if (!currentCourse) {
    await renderCourses();
    return;
  }
  coursesView.classList.add('hidden');
  sessionsView.classList.remove('hidden');
  currentCourseTitleEl.textContent = `Cours : ${currentCourse.title || '(sans titre)'}`;

  sessionsListEl.innerHTML = '';
  const sessions = await listSessionsByCourse(currentCourse.id);
  if (!sessions.length) {
    sessionsListEl.append(el('li', {}, "Aucune session dans ce cours pour l'instant."));
    return;
  }
  sessions.forEach(s => {
    sessionsListEl.append(
      SessionItem({
        id: s.id,
        title: s.title || '(sans titre)',
        wordsCount: Array.isArray(s.words) ? s.words.length : 0,
        onDelete: async (id) => {
          if (!confirm('Supprimer cette session ?')) return;
          await removeSession(id);
          await renderSessions();
        },
        onExport: (id) => {
          const filename = `${(currentCourse.title || 'cours').replace(/\s+/g,'_')}_${(s.title||'session').replace(/\s+/g,'_')}.json`;
          downloadJson(s, filename);
        }
      })
    );
  });
}

// ---- EVENTS ----

// Créer un cours
courseForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const title = courseTitleEl.value.trim();
    if (!title) return;
    await createCourse({ title });
    courseForm.reset();
    toast('Cours créé ✔️');
    await renderCourses();
  } catch (err) {
    console.error(err);
    toast("Erreur lors de la création du cours.");
  }
});

// Retour aux cours
backBtn?.addEventListener('click', async () => {
  await renderCourses();
});

// Créer une session dans le cours courant
sessionForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentCourse) {
    toast("Choisis d'abord un cours.");
    return;
  }
  try {
    const title = titleEl.value.trim();
    const words = JSON.parse(wordsEl.value.trim());
    await createSession({ title, words, courseId: currentCourse.id });
    sessionForm.reset();
    toast('Session ajoutée ✔️');
    await renderSessions();
  } catch (err) {
    console.error(err);
    toast('Erreur : JSON invalide ou problème lors de la création.');
  }
});

// Exporter toutes les sessions du cours
exportAllBtn?.addEventListener('click', async () => {
  if (!currentCourse) {
    toast("Choisis d'abord un cours.");
    return;
  }
  const sessions = await listSessionsByCourse(currentCourse.id);
  const filename = `${(currentCourse.title || 'cours').replace(/\s+/g,'_')}_sessions.json`;
  downloadJson(sessions, filename);
});

// Importer des sessions dans le cours courant
importInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!currentCourse) {
    toast("Choisis d'abord un cours.");
    e.target.value = '';
    return;
  }
  try {
    const txt = await readFileAsText(file);
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) throw new Error('Format attendu: tableau de sessions');
    for (const s of arr) {
      if (!s.title || !Array.isArray(s.words)) continue;
      await createSession({ title: s.title, words: s.words, courseId: currentCourse.id });
    }
    toast('Import terminé ✔️');
    await renderSessions();
  } catch (err) {
    console.error(err);
    toast('Import raté : JSON invalide.');
  } finally {
    e.target.value = '';
  }
});

// ---- INIT ----
renderCourses();
