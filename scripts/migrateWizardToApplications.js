#!/usr/bin/env node

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    console.error('FIREBASE_SERVICE_ACCOUNT must be valid JSON.');
    console.error(error);
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  const db = getFirestore();

  const specific = process.argv.slice(2);
  let docs;

  if (specific.length) {
    docs = await Promise.all(
      specific.map(async (uid) => {
        const snap = await db.doc(`business_wizard/${uid}`).get();
        return snap.exists ? { id: snap.id, data: snap.data() } : null;
      })
    );
    docs = docs.filter(Boolean);
  } else {
    const snapshot = await db.collection('business_wizard').get();
    docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  }

  if (!docs.length) {
    console.log('No wizard documents found to migrate.');
    return;
  }

  let migrated = 0;
  for (const { id, data } of docs) {
    const formData = data?.formData || {};
    const payload = {
      uid: id,
      email: data?.email || formData.ownerEmail || '',
      displayName: data?.displayName || formData.ownerName || '',
      status: data?.status || 'pending',
      formData,
      createdAt: data?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (data?.ownerPhone || formData.ownerPhone) {
      payload.ownerPhone = data.ownerPhone || formData.ownerPhone;
    }
    if (data?.address || formData.address) {
      payload.address = data.address || formData.address;
    }

    await db.doc(`applications/${id}`).set(payload, { merge: true });
    migrated += 1;
    console.log(`Migrated wizard -> applications for ${id}`);
  }

  console.log(`Done. Migrated ${migrated} document(s).`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
