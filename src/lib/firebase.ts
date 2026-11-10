import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Helper to safely read env variables in both Vite and Node testing contexts
const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || fallback;
    }
  } catch {}
  return fallback;
};

// SKOLAR Backend Firebase Production Configuration
export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyC_Vf4VHtWMEb0Ft1kGM67Qasns8KqiKGQ"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "skolar-backend.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "skolar-backend"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "skolar-backend.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "984763934122"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:984763934122:web:245825721c8e7b546c37d3"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-RT7C0MRNWG")
};

// Vercel Blob Token provided for document & receipt storage
export const BLOB_READ_WRITE_TOKEN = getEnv(
  "VITE_BLOB_READ_WRITE_TOKEN",
  "vercel_blob_rw_kqKxcWLpEJemlcvg_WgGyYRfchAxrhAyJIHg844g8LtXex7"
);

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);
try {
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence);
  }
} catch (e) {
  console.warn("Auth persistence notice:", e);
}

// Cloud Firestore Instance
export const db = getFirestore(app);

// Firebase Storage Instance (capped retry time so unreachable buckets fail fast cleanly)
export const storage = getStorage(app);
try {
  storage.maxUploadRetryTime = 4000;
  storage.maxOperationRetryTime = 4000;
} catch {}

/**
 * Waits for Firebase Auth persistence hydration to complete before reading/writing Firestore.
 * Returns true if an authenticated Firebase user session is active.
 */
export async function waitForAuthReady(): Promise<boolean> {
  try {
    if (typeof (auth as any).authStateReady === "function") {
      await (auth as any).authStateReady();
    }
  } catch (e) {
    console.debug("Auth state ready wait notice:", e);
  }
  return !!auth.currentUser;
}

/**
 * Compatibility helper: waits for Auth state hydration (never forces background auto-login when signed out)
 */
export async function ensureAuthenticated(): Promise<boolean> {
  return waitForAuthReady();
}

export default app;
