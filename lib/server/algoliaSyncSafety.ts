import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Business } from '../../types/business';
import {
  applyAlgoliaIndexSnapshot,
  selectVisibleBusinessesForAlgolia,
  transformBusinessForAlgolia,
  type AlgoliaBusinessRecord,
} from '../algoliaIndexing';

type AlgoliaPage<T> = { hits: T[] };

export type AlgoliaReadClient = {
  getSettings(options: { indexName: string }): Promise<Record<string, unknown>>;
  searchSingleIndex(options: {
    indexName: string;
    searchParams: Record<string, unknown>;
  }): Promise<{ nbHits: number }>;
  browseObjects<T>(options: {
    indexName: string;
    browseParams?: Record<string, unknown>;
    aggregator: (response: AlgoliaPage<T>) => void;
  }): Promise<unknown>;
  browseRules(options: {
    indexName: string;
    aggregator: (response: AlgoliaPage<Record<string, unknown>>) => void;
  }): Promise<unknown>;
  browseSynonyms(options: {
    indexName: string;
    aggregator: (response: AlgoliaPage<Record<string, unknown>>) => void;
  }): Promise<unknown>;
};

export type AlgoliaSyncClient = AlgoliaReadClient & {
  setSettings(options: {
    indexName: string;
    indexSettings: Record<string, unknown>;
  }): Promise<{ taskID: number }>;
  waitForTask(options: { indexName: string; taskID: number }): Promise<unknown>;
  replaceAllObjects(options: {
    indexName: string;
    objects: AlgoliaBusinessRecord[];
  }): Promise<unknown>;
};

export type AlgoliaSyncMode = 'dry-run' | 'preflight' | 'sync';

export type SnapshotReport = {
  candidateCount: number;
  visibleCount: number;
  discardedCount: number;
  records: AlgoliaBusinessRecord[];
};

export type PreflightReport = {
  indexName: string;
  objectCount: number;
  settings: {
    searchableAttributes: unknown;
    attributesForFaceting: unknown;
    customRanking: unknown;
    ranking: unknown;
    replicas: unknown;
  };
  rulesCount: number;
  synonymsCount: number;
};

export type BackupManifest = {
  version: 1;
  indexName: string;
  createdAt: string;
  verified: true;
  counts: {
    objects: number;
    rules: number;
    synonyms: number;
  };
  files: Record<string, { sha256: string; bytes: number }>;
};

export type VerifiedBackup = {
  directory: string;
  manifest: BackupManifest;
  verified: true;
};

type Logger = (message: string) => void;

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function collectPages<T>(
  browse: (aggregator: (response: AlgoliaPage<T>) => void) => Promise<unknown>,
): Promise<T[]> {
  const hits: T[] = [];
  await browse((response) => {
    hits.push(...response.hits);
  });
  return hits;
}

export function buildAlgoliaSnapshot(
  candidates: Array<Business & { id: string }>,
): SnapshotReport {
  const visible = selectVisibleBusinessesForAlgolia(candidates);
  return {
    candidateCount: candidates.length,
    visibleCount: visible.length,
    discardedCount: candidates.length - visible.length,
    records: visible.map(transformBusinessForAlgolia),
  };
}

export async function runAlgoliaPreflight(
  client: AlgoliaReadClient,
  indexName: string,
): Promise<PreflightReport> {
  const [settings, countResult, rules, synonyms] = await Promise.all([
    client.getSettings({ indexName }),
    client.searchSingleIndex({
      indexName,
      searchParams: { query: '', hitsPerPage: 0, attributesToRetrieve: [] },
    }),
    collectPages<Record<string, unknown>>((aggregator) =>
      client.browseRules({ indexName, aggregator })),
    collectPages<Record<string, unknown>>((aggregator) =>
      client.browseSynonyms({ indexName, aggregator })),
  ]);

  return {
    indexName,
    objectCount: countResult.nbHits,
    settings: {
      searchableAttributes: settings.searchableAttributes ?? [],
      attributesForFaceting: settings.attributesForFaceting ?? [],
      customRanking: settings.customRanking ?? [],
      ranking: settings.ranking ?? [],
      replicas: settings.replicas ?? [],
    },
    rulesCount: rules.length,
    synonymsCount: synonyms.length,
  };
}

export async function createVerifiedAlgoliaBackup(options: {
  client: AlgoliaReadClient;
  indexName: string;
  backupRoot: string;
  now?: Date;
}): Promise<VerifiedBackup> {
  const { client, indexName, backupRoot } = options;
  const createdAt = (options.now ?? new Date()).toISOString();
  const directory = path.join(
    backupRoot,
    `${safePathSegment(indexName)}-${createdAt.replace(/[:.]/g, '-')}`,
  );

  const [settings, objects, rules, synonyms] = await Promise.all([
    client.getSettings({ indexName }),
    collectPages<Record<string, unknown>>((aggregator) =>
      client.browseObjects({ indexName, browseParams: {}, aggregator })),
    collectPages<Record<string, unknown>>((aggregator) =>
      client.browseRules({ indexName, aggregator })),
    collectPages<Record<string, unknown>>((aggregator) =>
      client.browseSynonyms({ indexName, aggregator })),
  ]);

  await mkdir(backupRoot, { recursive: true });
  await mkdir(directory, { recursive: false });

  const payloads: Record<string, string> = {
    'objects.json': serialize(objects),
    'settings.json': serialize(settings),
    'rules.json': serialize(rules),
    'synonyms.json': serialize(synonyms),
  };

  for (const [fileName, content] of Object.entries(payloads)) {
    await writeFile(path.join(directory, fileName), content, {
      encoding: 'utf8',
      flag: 'wx',
    });
  }

  const files: BackupManifest['files'] = {};
  for (const [fileName, expectedContent] of Object.entries(payloads)) {
    const storedContent = await readFile(path.join(directory, fileName), 'utf8');
    if (storedContent !== expectedContent) {
      throw new Error(`Backup verification failed for ${fileName}`);
    }
    files[fileName] = {
      sha256: sha256(storedContent),
      bytes: Buffer.byteLength(storedContent, 'utf8'),
    };
  }

  const verifiedObjects = JSON.parse(await readFile(path.join(directory, 'objects.json'), 'utf8'));
  const verifiedRules = JSON.parse(await readFile(path.join(directory, 'rules.json'), 'utf8'));
  const verifiedSynonyms = JSON.parse(await readFile(path.join(directory, 'synonyms.json'), 'utf8'));
  if (
    !Array.isArray(verifiedObjects) || verifiedObjects.length !== objects.length
    || !Array.isArray(verifiedRules) || verifiedRules.length !== rules.length
    || !Array.isArray(verifiedSynonyms) || verifiedSynonyms.length !== synonyms.length
  ) {
    throw new Error('Backup count verification failed');
  }

  const manifest: BackupManifest = {
    version: 1,
    indexName,
    createdAt,
    verified: true,
    counts: {
      objects: objects.length,
      rules: rules.length,
      synonyms: synonyms.length,
    },
    files,
  };
  await writeFile(path.join(directory, 'manifest.json'), serialize(manifest), {
    encoding: 'utf8',
    flag: 'wx',
  });

  const storedManifest = JSON.parse(
    await readFile(path.join(directory, 'manifest.json'), 'utf8'),
  ) as BackupManifest;
  if (storedManifest.verified !== true || storedManifest.counts.objects !== objects.length) {
    throw new Error('Backup manifest verification failed');
  }

  return { directory, manifest: storedManifest, verified: true };
}

export async function runGuardedAlgoliaSync(options: {
  client: AlgoliaSyncClient;
  indexName: string;
  records: AlgoliaBusinessRecord[];
  indexSettings: Record<string, unknown>;
  backupRoot: string;
  backupFactory?: typeof createVerifiedAlgoliaBackup;
}): Promise<VerifiedBackup> {
  const backup = await (options.backupFactory ?? createVerifiedAlgoliaBackup)({
    client: options.client,
    indexName: options.indexName,
    backupRoot: options.backupRoot,
  });

  if (backup.verified !== true || backup.manifest.verified !== true) {
    throw new Error('Refusing destructive Algolia sync without a verified backup');
  }

  await applyAlgoliaIndexSnapshot(
    options.client,
    options.indexName,
    options.records,
    options.indexSettings,
  );
  return backup;
}

export async function executeAlgoliaMode(options: {
  mode: AlgoliaSyncMode;
  indexName: string;
  indexSettings: Record<string, unknown>;
  backupRoot: string;
  loadCandidates: () => Promise<Array<Business & { id: string }>>;
  getAlgoliaClient: () => AlgoliaSyncClient;
  logger?: Logger;
  backupFactory?: typeof createVerifiedAlgoliaBackup;
}): Promise<SnapshotReport | PreflightReport | { snapshot: SnapshotReport; backup: VerifiedBackup }> {
  const log = options.logger ?? (() => undefined);

  if (options.mode === 'preflight') {
    const report = await runAlgoliaPreflight(options.getAlgoliaClient(), options.indexName);
    log(JSON.stringify(report, null, 2));
    return report;
  }

  const snapshot = buildAlgoliaSnapshot(await options.loadCandidates());
  if (options.mode === 'dry-run') {
    log(JSON.stringify({
      mode: 'dry-run',
      indexName: options.indexName,
      candidateCount: snapshot.candidateCount,
      visibleCount: snapshot.visibleCount,
      discardedCount: snapshot.discardedCount,
      proposedSettings: options.indexSettings,
    }, null, 2));
    return snapshot;
  }

  const backup = await runGuardedAlgoliaSync({
    client: options.getAlgoliaClient(),
    indexName: options.indexName,
    records: snapshot.records,
    indexSettings: options.indexSettings,
    backupRoot: options.backupRoot,
    backupFactory: options.backupFactory,
  });
  log(JSON.stringify({
    mode: 'sync',
    indexName: options.indexName,
    indexedCount: snapshot.visibleCount,
    backupDirectory: backup.directory,
    backupVerified: backup.verified,
  }, null, 2));
  return { snapshot, backup };
}
