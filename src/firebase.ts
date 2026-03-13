import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase конфигурация проекта uzbechka-794ad
const firebaseConfig = {
  apiKey: "AIzaSyAiAGck0caP4ERcwObJ8WSPYAlPkJS-3kE",
  authDomain: "uzbechka-794ad.firebaseapp.com",
  projectId: "uzbechka-794ad",
  storageBucket: "uzbechka-794ad.firebasestorage.app",
  messagingSenderId: "785275821102",
  appId: "1:785275821102:web:2df9ab569951bc07e253bf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
