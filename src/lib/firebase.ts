import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, enableNetwork, disableNetwork } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

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
// Single-tab persistence: the multi-tab manager's shared watch-stream lease is
// the known trigger for fatal "Target ID already exists" assertions that wedge
// the client. Electron is single-window; web tabs each keep their own cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(undefined)
  }),
  experimentalForceLongPolling: false,
  useFetchStreams: true,
  ignoreUndefinedProperties: true,
} as any);

// Initialize Firebase Auth and export it
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

export function syncAuthLanguage(lang: string) {
  auth.languageCode = lang;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      enableNetwork(db).catch(console.error)
    }
  })
}

export { enableNetwork, disableNetwork }

