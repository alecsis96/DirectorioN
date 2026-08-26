// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getEffectiveAlgoliaIndexSettings } from '../lib/algoliaClient';
import {
  buildAlgoliaSnapshot,
  createVerifiedAlgoliaBackup,
  executeAlgoliaMode,
  runGuardedAlgoliaSync,
  type AlgoliaSyncClient,
  type VerifiedBackup,
} from '../lib/server/algoliaSyncSafety';
import type { Business } from '../types/business';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

function business(id: string, overrides: Partial<Business> = {}): Business & { id: string } {
  return {
    id,
    name: `Negocio ${id}`,
    businessStatus: 'published',
    ...overrides,
  };
}

function createClient() {
  const calls: string[] = [];
  const client = {
    getSettings: vi.fn(async () => ({
      searchableAttributes: ['name'],
      attributesForFaceting: ['searchable(plan)'],
      customRanking: ['desc(isPremium)'],
      ranking: ['custom'],
      replicas: ['businesses_replica'],
    })),
    searchSingleIndex: vi.fn(async () => ({ nbHits: 2 })),
    browseObjects: vi.fn(async ({ aggregator }) => {
      aggregator({ hits: [{ objectID: 'one' }, { objectID: 'two' }] });
    }),
    browseRules: vi.fn(async ({ aggregator }) => {
      aggregator({ hits: [{ objectID: 'rule-one' }] });
    }),
    browseSynonyms: vi.fn(async ({ aggregator }) => {
      aggregator({ hits: [{ objectID: 'synonym-one', type: 'synonym' }] });
    }),
    setSettings: vi.fn(async () => {
      calls.push('settings');
      return { taskID: 7 };
    }),
    waitForTask: vi.fn(async () => {
      calls.push('wait');
    }),
    replaceAllObjects: vi.fn(async () => {
      calls.push('replace');
    }),
    clearObjects: vi.fn(async () => {
      calls.push('clear');
    }),
  };
  return { client: client as unknown as AlgoliaSyncClient, raw: client, calls };
}

describe('seguridad del sync de Algolia', () => {
  it('indexa reviewCount agregado sin consultas adicionales', () => {
    const snapshot = buildAlgoliaSnapshot([business('visible', { reviewCount: 19 })]);

    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.records[0].reviewCount).toBe(19);
  });

  it('dry-run lee candidatos y realiza cero operaciones Algolia', async () => {
    const { raw } = createClient();
    const getAlgoliaClient = vi.fn(() => {
      throw new Error('dry-run must not construct an Algolia client');
    });

    const report = await executeAlgoliaMode({
      mode: 'dry-run',
      indexName: 'businesses',
      indexSettings: getEffectiveAlgoliaIndexSettings(false),
      backupRoot: '.algolia-backups',
      loadCandidates: vi.fn(async () => [
        business('visible'),
        business('hidden', { visibility: 'hidden' }),
      ]),
      getAlgoliaClient,
    });

    expect(getAlgoliaClient).not.toHaveBeenCalled();
    expect(raw.setSettings).not.toHaveBeenCalled();
    expect(raw.replaceAllObjects).not.toHaveBeenCalled();
    expect(raw.clearObjects).not.toHaveBeenCalled();
    expect(report).toMatchObject({ candidateCount: 2, visibleCount: 1, discardedCount: 1 });
  });

  it('preflight usa exclusivamente lecturas remotas sanitizadas', async () => {
    const { client, raw } = createClient();
    const loadCandidates = vi.fn(async () => [business('unused')]);

    const report = await executeAlgoliaMode({
      mode: 'preflight',
      indexName: 'businesses',
      indexSettings: getEffectiveAlgoliaIndexSettings(false),
      backupRoot: '.algolia-backups',
      loadCandidates,
      getAlgoliaClient: () => client,
    });

    expect(loadCandidates).not.toHaveBeenCalled();
    expect(raw.getSettings).toHaveBeenCalledOnce();
    expect(raw.searchSingleIndex).toHaveBeenCalledOnce();
    expect(raw.browseRules).toHaveBeenCalledOnce();
    expect(raw.browseSynonyms).toHaveBeenCalledOnce();
    expect(raw.setSettings).not.toHaveBeenCalled();
    expect(raw.replaceAllObjects).not.toHaveBeenCalled();
    expect(raw.clearObjects).not.toHaveBeenCalled();
    expect(report).toEqual({
      indexName: 'businesses',
      objectCount: 2,
      settings: {
        searchableAttributes: ['name'],
        attributesForFaceting: ['searchable(plan)'],
        customRanking: ['desc(isPremium)'],
        ranking: ['custom'],
        replicas: ['businesses_replica'],
      },
      rulesCount: 1,
      synonymsCount: 1,
    });
  });

  it('excluye negocios que no cumplen visibilidad canónica', () => {
    const snapshot = buildAlgoliaSnapshot([
      business('visible'),
      business('hidden', { visibility: 'hidden' }),
      business('archived', { adminStatus: 'archived' }),
      business('inactive', { isActive: false }),
      business('draft', { businessStatus: 'draft' }),
    ]);

    expect(snapshot.records.map((record) => record.objectID)).toEqual(['visible']);
    expect(snapshot.discardedCount).toBe(4);
  });

  it('crea un backup local con objetos, configuración y hashes verificados', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'algolia-backup-test-'));
    temporaryDirectories.push(root);
    const { client } = createClient();

    const backup = await createVerifiedAlgoliaBackup({
      client,
      indexName: 'businesses',
      backupRoot: path.join(root, 'backups'),
      now: new Date('2026-08-25T12:00:00.000Z'),
    });

    expect(backup.verified).toBe(true);
    expect(backup.manifest.counts).toEqual({ objects: 2, rules: 1, synonyms: 1 });
    expect(Object.keys(backup.manifest.files)).toEqual([
      'objects.json',
      'settings.json',
      'rules.json',
      'synonyms.json',
    ]);
    for (const file of Object.values(backup.manifest.files)) {
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
    }
    const manifest = JSON.parse(await readFile(path.join(backup.directory, 'manifest.json'), 'utf8'));
    expect(manifest.verified).toBe(true);
  });

  it('rechaza el reemplazo cuando el backup falla o no está verificado', async () => {
    const { client, raw } = createClient();
    const failedBackup = vi.fn(async () => {
      throw new Error('backup failed');
    });

    await expect(runGuardedAlgoliaSync({
      client,
      indexName: 'businesses',
      records: [],
      indexSettings: getEffectiveAlgoliaIndexSettings(false),
      backupRoot: '.algolia-backups',
      backupFactory: failedBackup,
    })).rejects.toThrow('backup failed');

    expect(raw.setSettings).not.toHaveBeenCalled();
    expect(raw.replaceAllObjects).not.toHaveBeenCalled();

    const invalidBackup = vi.fn(async () => ({
      verified: false,
      directory: 'invalid',
      manifest: { verified: false },
    }) as unknown as VerifiedBackup);
    await expect(runGuardedAlgoliaSync({
      client,
      indexName: 'businesses',
      records: [],
      indexSettings: getEffectiveAlgoliaIndexSettings(false),
      backupRoot: '.algolia-backups',
      backupFactory: invalidBackup,
    })).rejects.toThrow('without a verified backup');

    expect(raw.setSettings).not.toHaveBeenCalled();
    expect(raw.replaceAllObjects).not.toHaveBeenCalled();
  });

  it('completa y verifica el backup antes de settings y reemplazo', async () => {
    const { client, calls } = createClient();
    const backupFactory = vi.fn(async () => {
      calls.push('backup');
      return {
        directory: '.algolia-backups/verified',
        verified: true,
        manifest: {
          version: 1,
          indexName: 'businesses',
          createdAt: '2026-08-25T12:00:00.000Z',
          verified: true,
          counts: { objects: 2, rules: 1, synonyms: 1 },
          files: {},
        },
      } satisfies VerifiedBackup;
    });

    await runGuardedAlgoliaSync({
      client,
      indexName: 'businesses',
      records: [],
      indexSettings: getEffectiveAlgoliaIndexSettings(false),
      backupRoot: '.algolia-backups',
      backupFactory,
    });

    expect(calls).toEqual(['backup', 'settings', 'wait', 'replace']);
  });

  it('solo permite settings neutrales sin ranking ni facets comerciales', () => {
    const settings = getEffectiveAlgoliaIndexSettings(false);
    const ranking = settings.customRanking.join(' ').toLowerCase();
    const facets = settings.attributesForFaceting.join(' ').toLowerCase();

    for (const commercialTerm of ['ispremium', 'isfeatured', 'plan', 'sponsor', 'featured']) {
      expect(ranking).not.toContain(commercialTerm);
      expect(facets).not.toContain(commercialTerm);
    }
    expect(settings.customRanking).toEqual(['desc(rating)', 'desc(reviewCount)']);
  });
});
