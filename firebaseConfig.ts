// Configuración de Firebase
import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

function readEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: readEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: readEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const REDIRECT_ERROR_CODES = new Set<string>([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/internal-error",
]);

export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error?.code === "auth/requests-from-referrer-blocked") {
      console.error([
        "Firebase Authentication rejected the request because of the API key HTTP referrer restrictions.",
        "Add the domains you use locally (for example http://localhost:3000) and in production to the allowed list for the Web API key.",
        "Firebase Console > Project settings > General > Your apps > Firebase SDK snippet > Web API Key > Manage in Google Cloud Console.",
      ].join(" "));
    }
    if (typeof window !== "undefined") {
      const code = typeof error?.code === "string" ? error.code : undefined;
      if (!code || REDIRECT_ERROR_CODES.has(code)) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
    }
    throw error;
  }
}

let redirectHandled = false;

export async function consumeAuthRedirect(): Promise<void> {
  if (redirectHandled || typeof window === "undefined") return;
  redirectHandled = true;
  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("firebase redirect error", error);
  }
}


