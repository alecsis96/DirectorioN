import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import approveReceipt from '../pages/api/admin/approve-receipt';
import paymentBusinesses from '../pages/api/admin/payment-businesses';
import sendAdminReminder from '../pages/api/admin/send-payment-reminder';
import updatePlan from '../pages/api/admin/update-plan';
import upgradePlan from '../pages/api/businesses/upgrade-plan';
import uploadTransfer from '../pages/api/businesses/upload-transfer';
import checkExpiredPayments from '../pages/api/cron/check-expired-payments';
import checkPaymentReminders from '../pages/api/cron/check-payment-reminders';
import migratePaymentDates from '../pages/api/migrate-payment-dates';
import notifyPaymentFailed from '../pages/api/notify-payment-failed';
import paymentHistory from '../pages/api/payment-history';
import sendPaymentReminder from '../pages/api/send-payment-reminder';
import createCheckoutSession from '../pages/api/stripe/create-checkout-session';
import { GET as getScarcity } from '../app/api/scarcity/route';
import { GET as getScarcityMetrics } from '../app/api/scarcity/metrics/route';
import { GET as expirePremiumPlans } from '../app/api/cron/expire-premium-plans/route';
import { downgradeExpiredPremiumPlans } from '../lib/server/premiumPlanExpiry';
import {
  addToWaitlist,
  canUpgradeToPlan,
  getScarcityMetrics as getScarcityDomainMetrics,
  notifyWaitlistWhenAvailable,
} from '../lib/scarcitySystem';

type MockResponse = {
  statusCode: number;
  body: any;
  status: (status: number) => MockResponse;
  json: (body: any) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(status) {
      this.statusCode = status;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Hotfix 0.2A monetization kill switch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['checkout', createCheckoutSession, 'POST'],
    ['upgrade-plan', upgradePlan, 'POST'],
    ['upload-transfer', uploadTransfer, 'POST'],
    ['approve-receipt', approveReceipt, 'POST'],
    ['update-plan', updatePlan, 'POST'],
    ['payment-businesses', paymentBusinesses, 'GET'],
    ['admin reminder', sendAdminReminder, 'POST'],
    ['payment-history', paymentHistory, 'GET'],
    ['notify-payment-failed', notifyPaymentFailed, 'POST'],
    ['send-payment-reminder', sendPaymentReminder, 'POST'],
    ['migrate-payment-dates', migratePaymentDates, 'POST'],
    ['check-payment-reminders', checkPaymentReminders, 'GET'],
    ['check-expired-payments', checkExpiredPayments, 'GET'],
  ])('%s returns 503 before external work', async (_name, handler, method) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = response();

    await handler({ method, headers: {}, body: {}, query: {}, cookies: {} } as any, res as any);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: 'Monetization is temporarily disabled',
      code: 'MONETIZATION_DISABLED',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['scarcity', getScarcity],
    ['scarcity metrics', getScarcityMetrics],
    ['premium expiry cron', expirePremiumPlans],
  ])('%s App route returns 503', async (_name, handler) => {
    const result = await handler(new NextRequest('http://localhost/api/test'));
    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual({
      error: 'Monetization is temporarily disabled',
      code: 'MONETIZATION_DISABLED',
    });
  });

  it('premium expiry is a no-op with zero checked or downgraded documents', async () => {
    await expect(downgradeExpiredPremiumPlans({ force: true })).resolves.toEqual({
      checked: 0,
      downgraded: 0,
      skipped: true,
    });
  });

  it('fails closed in the scarcity domain before client or Admin SDK access', async () => {
    await expect(canUpgradeToPlan('restaurantes', 'featured')).rejects.toThrow('MONETIZATION_DISABLED');
    await expect(addToWaitlist('business-1', 'restaurantes', 'featured')).rejects.toThrow(
      'MONETIZATION_DISABLED'
    );
    await expect(notifyWaitlistWhenAvailable('restaurantes', 'featured')).rejects.toThrow(
      'MONETIZATION_DISABLED'
    );
    await expect(getScarcityDomainMetrics('restaurantes')).rejects.toThrow('MONETIZATION_DISABLED');
  });

  it('removes downgrade side effects from public reads and monetization schedules from Vercel', () => {
    const businessData = source('lib/server/businessData.ts');
    const vercel = JSON.parse(source('vercel.json'));

    expect(businessData).not.toContain('downgradeExpiredPremiumPlans');
    expect(vercel.crons ?? []).toEqual([]);
  });

  it('keeps assisted registration ownerless and neutralizes client-provided premium plans', () => {
    const actions = source('app/actions/adminBusinessActions.ts');
    const assisted = actions.slice(actions.indexOf('export async function createAssistedBusiness'));
    const createRoute = source('app/api/admin/create-business/route.ts');
    const approvals = source('app/actions/admin.ts');

    expect(assisted).not.toMatch(/\bownerId\s*:/);
    expect(assisted).toContain("MONETIZATION_FEATURE_ENABLED ? businessData.plan || 'free' : 'free'");
    expect(createRoute).toContain("const effectivePlan = MONETIZATION_FEATURE_ENABLED ? businessData.plan || 'free' : 'free'");
    expect(approvals).toContain("payload.plan = 'free'");
    expect(approvals).toContain('delete payload.stripeSubscriptionId');
    expect(approvals).toContain('delete sanitized.plan');
    expect(approvals).toContain('delete sanitized.featured');
  });
});
