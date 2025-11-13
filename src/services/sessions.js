import { db } from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const col = () => collection(db, "sessions");

export async function listSessions() {
  const snap = await getDocs(col());
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listSessionsByCourse(courseId) {
  const q = query(col(), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSession(id) {
  const d = await getDoc(doc(db, "sessions", id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

export async function createSession({ title, words, courseId }) {
  const ref = await addDoc(col(), {
    title,
    words,
    courseId: courseId || null,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function removeSession(id) {
  await deleteDoc(doc(db, "sessions", id));
}
