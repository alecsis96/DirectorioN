import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deliverBusinessReviewTelegram,
  reviewExistingBusiness,
  submitBusinessForReview,
} from '../lib/server/businessReviewWorkflow';
import { getStatusText } from '../lib/businessStates';

const completeBusiness = {
  ownerId: 'owner-1',
  name: 'Café Seguro',
  category: 'Alimentos y bebidas',
  colonia: 'Centro',
  phone: '9611234567',
  description: 'Café local',
  horarios: { lunes: { abierto: true, desde: '08:00', hasta: '18:00' } },
  businessStatus: 'draft',
  visibility: 'hidden',
  isActive: false,
};

class FakeDb {
  documents = new Map<string, Record<string, any>>();
  writes: Array<{ path: string; kind: string; data: Record<string, any> }> = [];

  doc(path: string) {
    return {
      path,
      set: async (data: Record<string, any>, options?: { merge: boolean }) => {
        const current = this.documents.get(path) ?? {};
        this.documents.set(path, options?.merge ? { ...current, ...data } : data);
      },
    };
  }

  async runTransaction<T>(callback: (transaction: any) => Promise<T>) {
    const pending: Array<{ path: string; kind: string; data: Record<string, any> }> = [];
    const transaction = {
      get: async (reference: { path: string }) => {
        const data = this.documents.get(reference.path);
        return { exists: Boolean(data), data: () => data };
      },
      update: (reference: { path: string }, data: Record<string, any>) =>
        pending.push({ path: reference.path, kind: 'update', data }),
      create: (reference: { path: string }, data: Record<string, any>) =>
        pending.push({ path: reference.path, kind: 'create', data }),
      set: (reference: { path: string }, data: Record<string, any>) =>
        pending.push({ path: reference.path, kind: 'set', data }),
    };
    const result = await callback(transaction);
    for (const write of pending) {
      if (write.kind === 'create' && this.documents.has(write.path)) throw new Error('already exists');
      this.documents.set(write.path, { ...(this.documents.get(write.path) ?? {}), ...write.data });
      this.writes.push(write);
    }
    return result;
  }
}

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('0.2R.5C business review cycle', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('saving a draft does not invoke a review notification', () => {
    const action = source('app/actions/businesses.ts');
    expect(action).not.toContain('deliverBusinessReviewTelegram');
    expect(action).not.toContain('/api/notify-business-review');
  });

  it('retires the legacy owner-triggered notification endpoint', () => {
    const endpoint = source('pages/api/notify-business-review.ts');
    expect(endpoint).toContain('status(410)');
    expect(endpoint).not.toContain('SLACK_WEBHOOK_URL');
    expect(endpoint).not.toContain('notifyBusinessReview');
  });

  it('an owner can explicitly move a complete draft to in_review', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness });
    const result = await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(result.success).toBe(true);
    expect(db.documents.get('businesses/b1')).toMatchObject({
      ownerId: 'owner-1', businessStatus: 'in_review', visibility: 'hidden', isActive: false,
    });
  });

  it('rejects an incomplete draft and returns a clear missing list', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ownerId: 'owner-1', businessStatus: 'draft', name: 'X' });
    const result = await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(result.success).toBe(false);
    expect(result.missingFields).toContain('categoría');
    expect(db.writes).toHaveLength(0);
  });

  it('does not let a different user submit the business', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness });
    const result = await submitBusinessForReview(db as any, 'b1', 'other-user');
    expect(result.success).toBe(false);
    expect(db.writes).toHaveLength(0);
  });

  it('a repeated submit is idempotent and creates no second delivery', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness });
    await submitBusinessForReview(db as any, 'b1', 'owner-1');
    const writeCount = db.writes.length;
    const repeated = await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(repeated).toMatchObject({ success: true, idempotent: true });
    expect(db.writes).toHaveLength(writeCount);
  });

  it('creates one deterministic Telegram delivery guard per review version', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness, reviewSubmissionVersion: 2 });
    await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(db.documents.has('notificationDeliveries/business-review-submitted-b1-3')).toBe(true);
  });

  it('allows a corrected draft to be resubmitted with a new delivery version', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness });
    await submitBusinessForReview(db as any, 'b1', 'owner-1');
    db.documents.set('businesses/b1', {
      ...db.documents.get('businesses/b1'),
      businessStatus: 'draft',
      description: 'Descripción corregida',
    });
    const result = await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(result.success).toBe(true);
    expect(db.documents.has('notificationDeliveries/business-review-submitted-b1-2')).toBe(true);
  });

  it('Telegram contains no owner contact data and links to the admin panel', async () => {
    vi.stubEnv('TELEGRAM_APPLICATION_ALERTS_ENABLED', 'true');
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'server-secret');
    vi.stubEnv('TELEGRAM_ADMIN_CHAT_ID', 'admin-chat');
    const db = new FakeDb();
    const reference = db.doc('notificationDeliveries/d1');
    const fetchImpl = vi.fn(async (_url: any, init: any) => {
      const payload = JSON.parse(init.body);
      expect(payload.text).toContain('Negocio: [dato omitido]');
      expect(payload.text).not.toContain('owner@example.com');
      expect(payload.reply_markup.inline_keyboard[0][0].url).toContain('/admin/pending-businesses');
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    });
    await deliverBusinessReviewTelegram({
      reference: reference as any,
      businessId: 'b1',
      businessName: 'owner@example.com 9611234567',
      fetchImpl: fetchImpl as any,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('skips Telegram without server configuration', async () => {
    vi.stubEnv('TELEGRAM_APPLICATION_ALERTS_ENABLED', 'false');
    const db = new FakeDb();
    const fetchImpl = vi.fn();
    const result = await deliverBusinessReviewTelegram({
      reference: db.doc('notificationDeliveries/d1') as any,
      businessId: 'b1', businessName: 'Café', fetchImpl: fetchImpl as any,
    });
    expect(result).toEqual({ sent: false, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('admin publishes only an in_review business and preserves ownerId', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness, businessStatus: 'in_review' });
    await reviewExistingBusiness({ db: db as any, businessId: 'b1', adminUid: 'admin', action: 'approve' });
    expect(db.documents.get('businesses/b1')).toMatchObject({
      ownerId: 'owner-1', businessStatus: 'published', status: 'published', visibility: 'published',
    });
  });

  it('admin cannot publish a draft or publish it twice', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness });
    await expect(reviewExistingBusiness({
      db: db as any, businessId: 'b1', adminUid: 'admin', action: 'approve',
    })).rejects.toThrow('ya no está en revisión');
  });

  it('does not reinterpret a legacy published business as a draft', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness, businessStatus: undefined, status: 'published' });
    const result = await submitBusinessForReview(db as any, 'b1', 'owner-1');
    expect(result.success).toBe(false);
    expect(db.writes).toHaveLength(0);
  });

  it('admin corrections return the business to hidden draft', async () => {
    const db = new FakeDb();
    db.documents.set('businesses/b1', { ...completeBusiness, businessStatus: 'in_review' });
    await reviewExistingBusiness({
      db: db as any, businessId: 'b1', adminUid: 'admin', action: 'reject', notes: 'Corrige el horario',
    });
    expect(db.documents.get('businesses/b1')).toMatchObject({
      ownerId: 'owner-1', businessStatus: 'draft', visibility: 'hidden', isActive: false,
    });
  });

  it('owner profile edits during review atomically invalidate that review', () => {
    const action = source('app/actions/businesses.ts');
    expect(action).toContain("const reviewInvalidated = currentStatus === 'in_review'");
    expect(action).toContain("businessStatus: 'draft'");
    expect(action).toContain('db.runTransaction');
  });

  it('legacy pending admin view keeps its server guard and redirects to the canonical in_review filter', () => {
    const page = source('app/admin/pending-businesses/page.tsx');
    expect(page).toContain("requireAdminPage('/admin/pending-businesses')");
    expect(page).toContain("redirect('/admin/businesses?status=in_review')");
  });

  it('owner Firestore writes cannot change state or ownership', () => {
    const rules = source('firestore.rules');
    const ownerRule = rules.slice(rules.indexOf('function validBusinessOwnerUpdate()'), rules.indexOf('function validBusinessAdminUpdate()'));
    const allowlist = ownerRule.match(/changedFields\.hasOnly\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
    expect(ownerRule).toContain('changedFields.hasOnly');
    expect(ownerRule).toContain("resource.data.businessStatus == 'draft'");
    expect(ownerRule).toContain("resource.data.get('status', 'draft') == 'draft'");
    expect(allowlist).not.toContain("'businessStatus'");
    expect(allowlist).not.toContain("'ownerId'");
  });

  it('admin client writes cannot bypass the server publication transition', () => {
    const rules = source('firestore.rules');
    const adminRule = rules.slice(rules.indexOf('function validBusinessAdminUpdate()'), rules.indexOf('// ============== RESEÑAS'));
    expect(adminRule).toContain("request.resource.data.get('ownerId', null) == resource.data.get('ownerId', null)");
    expect(adminRule).toContain("request.resource.data.get('businessStatus', null) == resource.data.get('businessStatus', null)");
  });

  it('publication paths require revocation-checked admin identity', () => {
    const actions = source('app/actions/adminBusinessActions.ts');
    const inbox = source('app/api/admin/inbox-action/route.ts');
    expect(actions).toMatch(/approveBusiness[\s\S]*?assertRevocationCheckedAdminToken/);
    expect(inbox).toContain('assertRevocationCheckedAdminToken(token)');
  });

  it('presents canonical draft, review and published copy', () => {
    expect(getStatusText({ businessStatus: 'draft' }).title).toBe('Borrador');
    expect(getStatusText({ businessStatus: 'in_review' })).toMatchObject({
      title: 'En revisión',
      description: 'YajaGon está revisando tu negocio. Te avisaremos cuando sea publicado.',
    });
    expect(getStatusText({ businessStatus: 'published', applicationStatus: 'rejected' }).title).toBe('Publicado');
  });
});
