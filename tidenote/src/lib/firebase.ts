import { initializeApp } from "firebase/app";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export it
export const db = getFirestore(app);

// Initialize Firebase Auth and export it
export const auth = getAuth(app);

// Pencere focus/blur'da Firestore ağını aç/kapat
// Sadece tarayıcı/Electron ortamında çalışır
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    enableNetwork(db).catch(console.error)
  })
}

export { enableNetwork, disableNetwork }

