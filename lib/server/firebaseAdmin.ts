import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let initialized = false;

function ensureApp() {
  if (initialized) return;
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
    const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
    initializeApp({ credential: cert(config) });
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
