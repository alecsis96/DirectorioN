import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  constructEvent: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = { sessions: { create: mocks.checkoutCreate } };
    webhooks = { constructEvent: mocks.constructEvent };
    subscriptions = { retrieve: mocks.subscriptionRetrieve };
  },
}));

vi.mock('../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: mocks.getDoc,
  updateDoc: mocks.updateDoc,
}));

import createCheckoutSession from '../pages/api/stripe/create-checkout-session';
import webhook from '../pages/api/stripe/webhook';

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(status: number) {
      this.statusCode = status;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
}

function webhookRequest(signature = 'valid-signature') {
  return {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('{"type":"checkout.session.completed"}');
    },
  } as any;
}

describe('Stripe kill switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checkout returns 503 without creating a Stripe session', async () => {
    const res = response();
    await createCheckoutSession({ method: 'POST', headers: {}, body: {} } as any, res as any);

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('MONETIZATION_DISABLED');
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it('rejects an invalid webhook signature with 400', async () => {
    mocks.constructEvent.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });
    const res = response();

    await webhook(webhookRequest('invalid-signature'), res as any);

    expect(res.statusCode).toBe(400);
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('acknowledges a valid webhook as a no-op without Firestore, Stripe, or notifications', async () => {
    mocks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { metadata: { businessId: 'business-1', plan: 'sponsor' } } },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = response();

    await webhook(webhookRequest(), res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, ignored: true });
    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.subscriptionRetrieve).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
