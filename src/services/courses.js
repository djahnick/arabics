import { db } from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const coursesCol = () => collection(db, "courses");
const sessionsCol = () => collection(db, "sessions");

export async function listCourses() {
  const snap = await getDocs(coursesCol());
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCourse({ title }) {
  const ref = await addDoc(coursesCol(), {
    title,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function renameCourse(id, title) {
  await updateDoc(doc(db, "courses", id), { title });
}

export async function removeCourse(id) {
  // supprimer les sessions liées à ce cours
  const q = query(sessionsCol(), where("courseId", "==", id));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "sessions", d.id));
  }
  // supprimer le cours
  await deleteDoc(doc(db, "courses", id));
}
