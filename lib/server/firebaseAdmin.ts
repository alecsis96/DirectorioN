import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let initialized = false;

function ensureApp() {
  if (initialized) return;
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId?.startsWith('demo-') && process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId });
      initialized = true;
      return;
    }
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
    const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
    initializeApp({ 
      credential: cert(config),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 
    });
  }
  initialized = true;
}

export function getAdminFirestore() {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureApp();
  return getAuth();
}

export function getAdminStorage() {
  ensureApp();
  return getStorage();
}
