import { db } from './firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export async function getUser(pseudo) {
  const ref = doc(db, "users", pseudo);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUser({ pseudo, passwordHash }) {
  const ref = doc(db, "users", pseudo);
  await setDoc(ref, {
    passwordHash,
    createdAt: serverTimestamp()
  });
  return pseudo;
}
