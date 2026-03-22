import { Timestamp, type QueryDocumentSnapshot, type DocumentData } from 'firebase-admin/firestore';

import { getAdminFirestore } from './firebaseAdmin';

type PremiumPlan = 'featured' | 'sponsor';

type ExpiryRunResult = {
  checked: number;
  downgraded: number;
  skipped?: boolean;
};

const PREMIUM_PLANS: PremiumPlan[] = ['featured', 'sponsor'];
const AUTO_RUN_INTERVAL_MS = 10 * 60 * 1000;

let lastAutoRunAt = 0;
let pendingRun: Promise<ExpiryRunResult> | null = null;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      const parsed = maybeTimestamp.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function getPlanFromDoc(data: DocumentData): PremiumPlan | null {
  const plan = String(data.plan || '').trim().toLowerCase();
  return PREMIUM_PLANS.includes(plan as PremiumPlan) ? (plan as PremiumPlan) : null;
}

function getExpiryDate(data: DocumentData): Date | null {
  return toDate(data.planExpiresAt) || toDate(data.nextPaymentDate);
}

function shouldDowngrade(data: DocumentData, now: Date) {
  const plan = getPlanFromDoc(data);
  if (!plan) return { downgrade: false as const };

  const expiryDate = getExpiryDate(data);
  if (!expiryDate) return { downgrade: false as const };

  if (expiryDate.getTime() > now.getTime()) {
    return { downgrade: false as const };
  }

  return {
    downgrade: true as const,
    previousPlan: plan,
    expiredAt: expiryDate,
  };
}

async function fetchPremiumBusinesses() {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection('businesses')
    .where('plan', 'in', PREMIUM_PLANS)
    .get();

  return snapshot.docs;
}

async function performDowngrade(now: Date): Promise<ExpiryRunResult> {
  const docs = await fetchPremiumBusinesses();
  const db = getAdminFirestore();
  const batch = db.batch();

  let checked = 0;
  let downgraded = 0;

  for (const doc of docs as QueryDocumentSnapshot<DocumentData>[]) {
    checked += 1;
    const data = doc.data();
    const decision = shouldDowngrade(data, now);

    if (!decision.downgrade) continue;

    downgraded += 1;
    batch.update(doc.ref, {
      plan: 'free',
      featured: false,
      isActive: true,
      previousPlan: decision.previousPlan,
      downgradedAt: Timestamp.fromDate(now),
      planUpdatedAt: Timestamp.fromDate(now),
      planExpiresAt: null,
      nextPaymentDate: null,
      paymentStatus: 'canceled',
      stripeSubscriptionStatus: null,
      disabledReason: null,
    });
  }

  if (downgraded > 0) {
    await batch.commit();
  }

  return { checked, downgraded };
}

export async function downgradeExpiredPremiumPlans(options?: {
  force?: boolean;
}): Promise<ExpiryRunResult> {
  const now = Date.now();

  if (!options?.force && now - lastAutoRunAt < AUTO_RUN_INTERVAL_MS) {
    return { checked: 0, downgraded: 0, skipped: true };
  }

  if (pendingRun) {
    return pendingRun;
  }

  lastAutoRunAt = now;
  pendingRun = performDowngrade(new Date(now));

  try {
    return await pendingRun;
  } finally {
    pendingRun = null;
  }
}
