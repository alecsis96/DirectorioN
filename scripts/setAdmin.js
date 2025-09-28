#!/usr/bin/env node

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
    console.error('Provide your service-account JSON via env var before running this script.');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    console.error(error);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/setAdmin.js <uid-or-email> [--email]');
    process.exit(1);
  }

  const identifier = args[0];
  const forceEmail = args.includes('--email');

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  const auth = getAuth();

  let userRecord;
  try {
    if (forceEmail || identifier.includes('@')) {
      userRecord = await auth.getUserByEmail(identifier);
    } else {
      userRecord = await auth.getUser(identifier);
    }
  } catch (error) {
    console.error('Could not find user for identifier:', identifier);
    console.error(error);
    process.exit(1);
  }

  const currentClaims = userRecord.customClaims || {};
  if (currentClaims.admin === true) {
    console.log(`User ${userRecord.uid} already has admin privileges.`);
    return;
  }

  const nextClaims = { ...currentClaims, admin: true };

  try {
    await auth.setCustomUserClaims(userRecord.uid, nextClaims);
    console.log(`Admin claim set for user ${userRecord.uid}.`);
    console.log('Ask the user to sign out and sign in again to refresh their token.');
  } catch (error) {
    console.error('Failed to set admin claim.');
    console.error(error);
    process.exit(1);
  }
}

main();
