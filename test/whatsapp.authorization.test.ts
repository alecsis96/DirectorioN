import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ assertAdminToken: vi.fn() }));

vi.mock('../lib/server/authorization', () => {
  class AuthorizationError extends Error {
    constructor(message: string, readonly status: 401 | 403) {
      super(message);
      this.name = 'AuthorizationError';
    }
  }
  return { AuthorizationError, assertAdminToken: mocks.assertAdminToken };
});

import { AuthorizationError } from '../lib/server/authorization';
import sendWhatsAppNotification from '../pages/api/send-whatsapp-notification';

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

function request(type: 'approved' | 'rejected' | 'payment_received', token?: string) {
  return {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: {
      type,
      to: '+529191234567',
      businessName: 'Negocio de prueba',
      ownerName: 'Propietario',
    },
  } as any;
}

describe('WhatsApp/Twilio authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = 'AC-test';
    process.env.TWILIO_AUTH_TOKEN = 'token-test';
    process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
  });

  it('returns 503 for payment_received before authentication or Twilio', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = response();

    await sendWhatsAppNotification(request('payment_received'), res as any);

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('MONETIZATION_DISABLED');
    expect(mocks.assertAdminToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('denies anonymous callers before Twilio', async () => {
    mocks.assertAdminToken.mockRejectedValueOnce(new AuthorizationError('Autenticacion requerida.', 401));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = response();

    await sendWhatsAppNotification(request('approved'), res as any);

    expect(res.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('denies authenticated non-admin callers before Twilio', async () => {
    mocks.assertAdminToken.mockRejectedValueOnce(new AuthorizationError('Permisos de administrador requeridos.', 403));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = response();

    await sendWhatsAppNotification(request('rejected', 'normal-user-token'), res as any);

    expect(res.statusCode).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows the legitimate admin path and the caller forwards its verified token', async () => {
    mocks.assertAdminToken.mockResolvedValueOnce({ uid: 'admin-1', admin: true });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'SM-test' }),
    } as Response);
    const res = response();

    await sendWhatsAppNotification(request('approved', 'admin-token'), res as any);

    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(mocks.assertAdminToken).toHaveBeenCalledWith('admin-token');

    const caller = readFileSync(
      resolve(process.cwd(), 'pages/api/admin/review-business.ts'),
      'utf8'
    );
    expect(caller).toContain('Authorization: `Bearer ${token}`');
  });
});
