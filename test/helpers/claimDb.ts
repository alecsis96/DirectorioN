import { hashOwnershipClaimToken } from '../../lib/server/ownershipClaims';
type Data = Record<string, any>;
type DocRef = { kind: 'doc'; collection: string; id: string; get(): Promise<Snapshot> };
type Query = {
  kind: 'query';
  collection: string;
  field: string;
  value: unknown;
  max?: number;
  limit(value: number): Query;
  get(): Promise<{ docs: Snapshot[]; size: number }>;
};
type Snapshot = {
  exists: boolean;
  id: string;
  ref: DocRef;
  data(): Data | undefined;
};

export const CLAIM_TOKEN = 'A'.repeat(43);
export const NOW = new Date('2026-09-02T18:00:00.000Z');

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createRedeemDb(overrides: {
  claim?: Data;
  guard?: Data;
  business?: Data;
  application?: Data;
} = {}) {
  const docs = new Map<string, Data>();
  let generated = 0;
  let transactionTail = Promise.resolve();
  docs.set('ownershipClaims/claim-1', {
    businessId: 'business-1',
    applicationId: 'application-random-v2',
    emailNormalized: 'owner@example.com',
    tokenHash: hashOwnershipClaimToken(CLAIM_TOKEN),
    status: 'active',
    expiresAt: new Date('2026-09-09T18:00:00.000Z'),
    consumedAt: null,
    consumedByUid: null,
    version: 3,
    ...overrides.claim,
  });
  docs.set('ownershipClaimGuards/business-1', {
    businessId: 'business-1',
    activeClaimId: 'claim-1',
    version: 3,
    ...overrides.guard,
  });
  docs.set('businesses/business-1', {
    name: 'Negocio ownerless',
    sourceApplicationId: 'application-random-v2',
    applicationSchemaVersion: 2,
    ownerEmail: 'untrusted-contact@example.com',
    businessStatus: 'draft',
    visibility: 'hidden',
    ...overrides.business,
  });
  docs.set('applications/application-random-v2', {
    schemaVersion: 2,
    status: 'approved',
    businessId: 'business-1',
    ownerEmail: 'owner@example.com',
    ...overrides.application,
  });

  const makeRef = (collection: string, id: string): DocRef => {
    const ref: DocRef = {
      kind: 'doc', collection, id,
      async get() { return snapshot(ref); },
    };
    return ref;
  };
  const snapshot = (ref: DocRef): Snapshot => {
    const data = docs.get(`${ref.collection}/${ref.id}`);
    return { exists: Boolean(data), id: ref.id, ref, data: () => data ? clone(data) : undefined };
  };
  const runQuery = async (query: Query) => {
    const snapshots: Snapshot[] = [];
    for (const [path, data] of docs) {
      const separator = path.indexOf('/');
      const collection = path.slice(0, separator);
      const id = path.slice(separator + 1);
      if (collection === query.collection && data[query.field] === query.value) {
        snapshots.push(snapshot(makeRef(collection, id)));
      }
    }
    const limited = query.max ? snapshots.slice(0, query.max) : snapshots;
    return { docs: limited, size: limited.length };
  };
  const makeQuery = (collection: string, field: string, value: unknown, max?: number): Query => ({
    kind: 'query', collection, field, value, max,
    limit(nextMax) { return makeQuery(collection, field, value, nextMax); },
    async get() { return runQuery(this); },
  });
  const db: any = {
    collection(name: string) {
      return {
        doc(id?: string) { return makeRef(name, id || `generated-${++generated}`); },
        where(field: string, operator: string, value: unknown) {
          if (operator !== '==') throw new Error('unsupported query');
          return makeQuery(name, field, value);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const writes: Array<() => void> = [];
      try {
        const transaction = {
          async get(ref: DocRef) { return snapshot(ref); },
          update(ref: DocRef, update: Data) {
            writes.push(() => {
              const path = `${ref.collection}/${ref.id}`;
              const previousData = docs.get(path);
              if (!previousData) throw new Error(`NOT_FOUND:${path}`);
              docs.set(path, { ...previousData, ...clone(update) });
            });
          },
          create(ref: DocRef, data: Data) {
            writes.push(() => {
              const path = `${ref.collection}/${ref.id}`;
              if (docs.has(path)) throw new Error(`ALREADY_EXISTS:${path}`);
              docs.set(path, clone(data));
            });
          },
          set(ref: DocRef, data: Data) {
            writes.push(() => docs.set(`${ref.collection}/${ref.id}`, clone(data)));
          },
        };
        const result = await callback(transaction);
        writes.forEach((write) => write());
        return result;
      } finally {
        release();
      }
    },
  };

  return {
    db,
    seed(path: string, data: Data) { docs.set(path, clone(data)); },
    get(path: string) { return clone(docs.get(path)); },
    entries(collection: string) {
      return [...docs.entries()].filter(([path]) => path.startsWith(`${collection}/`));
    },
  };
}
