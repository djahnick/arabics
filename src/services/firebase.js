import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbRskJ43G0qvU9e2SosBOxr24gV8zvo5Y",
  authDomain: "quizlet-bb37b.firebaseapp.com",
  projectId: "quizlet-bb37b",
  storageBucket: "quizlet-bb37b.firebasestorage.app",
  messagingSenderId: "933553623266",
  appId: "1:933553623266:web:478ed1df6f2cc59dafcebb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
