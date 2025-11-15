import { db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  increment,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const sessionStatsCol = () => collection(db, "sessionStats");
const wordStatsCol   = () => collection(db, "wordStats");

function sessionStatsDocId(userId, sessionId) {
  return `${userId}__${sessionId}`;
}
function wordStatsDocId(userId, sessionId, index) {
  return `${userId}__${sessionId}__${index}`;
}

// Enregistre le résultat d'une partie complète
// answers = [{ index, known }, ...]
export async function recordGameResult({ userId, sessionId, answers }) {
  if (!userId || !sessionId || !Array.isArray(answers) || !answers.length) {
    return;
  }

  let totalKnown = 0;
  let totalUnknown = 0;
  for (const a of answers) {
    if (a.known) totalKnown++;
    else totalUnknown++;
  }

  const sessRef = doc(db, "sessionStats", sessionStatsDocId(userId, sessionId));

  // Met à jour les stats globales de la session
  await setDoc(sessRef, {
    userId,
    sessionId,
    totalPlays: increment(1),
    totalKnown: increment(totalKnown),
    totalUnknown: increment(totalUnknown),
    lastPlayedAt: serverTimestamp()
  }, { merge: true });

  // Met à jour les stats par mot
  const now = serverTimestamp();
  const batchPromises = [];

  for (const a of answers) {
    const idx = a.index;
    if (typeof idx !== 'number') continue;

    const ref = doc(db, "wordStats", wordStatsDocId(userId, sessionId, idx));
    const fields = {
      userId,
      sessionId,
      index: idx,
      lastSeenAt: now
    };
    if (a.known) {
      fields.known   = increment(1);
      fields.unknown = increment(0);
    } else {
      fields.known   = increment(0);
      fields.unknown = increment(1);
    }
    batchPromises.push(setDoc(ref, fields, { merge: true }));
  }

  await Promise.all(batchPromises);
}

// Récupère les stats globales d'une session pour un utilisateur
export async function getSessionStats(userId, sessionId) {
  const ref = doc(db, "sessionStats", sessionStatsDocId(userId, sessionId));
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Récupère les stats par mot pour une session et un utilisateur
export async function getWordStatsForSession(userId, sessionId) {
  const q = query(
    wordStatsCol(),
    where("userId", "==", userId),
    where("sessionId", "==", sessionId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
