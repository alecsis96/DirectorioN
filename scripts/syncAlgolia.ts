/**
 * Sincronización segura Firestore → Algolia.
 *
 * Lecturas solamente:
 *   npm run sync-algolia -- --dry-run
 *   npm run sync-algolia -- --preflight
 *
 * Sync real (crea y verifica un backup local antes de cualquier reemplazo):
 *   npm run sync-algolia
 */

import path from 'node:path';
import { readFileSync } from 'node:fs';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import {
  ALGOLIA_INDEX_NAME,
  getAdminClient,
  INDEX_SETTINGS,
} from '../lib/algoliaClient';
import {
  executeAlgoliaMode,
  type AlgoliaSyncClient,
  type AlgoliaSyncMode,
} from '../lib/server/algoliaSyncSafety';
import type { Business } from '../types/business';

function parseMode(argument: string | undefined): AlgoliaSyncMode {
  if (argument === undefined) return 'sync';
  if (argument === '--dry-run') return 'dry-run';
  if (argument === '--preflight') return 'preflight';
  throw new Error(`Unknown Algolia sync mode: ${argument}`);
}

function getDatabase() {
  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : JSON.parse(readFileSync(
        path.resolve(process.cwd(), 'serviceAccountKey.json'),
        'utf8',
      ));

    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

async function loadPublishedBusinesses(): Promise<Array<Business & { id: string }>> {
  const snapshot = await getDatabase()
    .collection('businesses')
    .where('businessStatus', '==', 'published')
    .get();

  return snapshot.docs.map((document) => ({
    ...(document.data() as Business),
    id: document.id,
  }));
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv[2]);
  if (process.argv.length > 3) {
    throw new Error('Only one Algolia sync mode may be specified');
  }

  await executeAlgoliaMode({
    mode,
    indexName: ALGOLIA_INDEX_NAME,
    indexSettings: INDEX_SETTINGS,
    backupRoot: path.resolve(process.cwd(), '.algolia-backups'),
    loadCandidates: loadPublishedBusinesses,
    getAlgoliaClient: () => getAdminClient() as AlgoliaSyncClient,
    logger: (message) => process.stdout.write(`${message}\n`),
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Algolia sync error';
  console.error(`Algolia sync failed: ${message}`);
  process.exitCode = 1;
});
