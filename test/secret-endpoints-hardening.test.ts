import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdTokenOrThrow: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  getAdminFirestore: vi.fn(),
}));

vi.mock('../lib/server/authorization', () => {
  class AuthorizationError extends Error {
    constructor(message: string, readonly status: 401 | 403) {
      super(message);
      this.name = 'AuthorizationError';
    }
  }
  return {
    AuthorizationError,
    verifyIdTokenOrThrow: mocks.verifyIdTokenOrThrow,
    isAdminIdentity: (decoded: { admin?: boolean }) => decoded.admin === true,
  };
});

vi.mock('../lib/server/firebaseAdmin', () => ({
  getAdminFirestore: mocks.getAdminFirestore,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

import { AuthorizationError } from '../lib/server/authorization';
import { isCronRequestAuthorized } from '../lib/server/cronAuthorization';
import sendEmailNotification from '../pages/api/send-email-notification';

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

function emailRequest(options: {
  token?: string;
  type?: 'approved' | 'rejected' | 'welcome';
  to?: string;
} = {}) {
  return {
    method: 'POST',
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    body: {
      type: options.type ?? 'approved',
      to: options.to ?? 'owner@example.test',
      businessName: 'Negocio seguro',
      ownerName: 'Propietario',
    },
  } as any;
}

async function loadCronHandlers(monetizationEnabled: boolean) {
  vi.resetModules();
  vi.doMock('../lib/featureFlags', () => ({
    MONETIZATION_FEATURE_ENABLED: monetizationEnabled,
  }));
  const [reminders, expired] = await Promise.all([
    import('../pages/api/cron/check-payment-reminders'),
    import('../pages/api/cron/check-expired-payments'),
  ]);
  return [reminders.default, expired.default] as const;
}

describe('Hotfix 0.2A.2: email authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: 'test-message' });
    vi.stubEnv('EMAIL_USER', 'sender@example.test');
    vi.stubEnv('EMAIL_PASS', 'test-only-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rechaza usuarios anónimos antes de construir el transporte de correo', async () => {
    mocks.verifyIdTokenOrThrow.mockRejectedValueOnce(
      new AuthorizationError('Autenticacion requerida.', 401),
    );
    const res = response();

    await sendEmailNotification(emailRequest(), res as any);

    expect(res.statusCode).toBe(401);
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('impide a un usuario normal enviar plantillas administrativas', async () => {
    mocks.verifyIdTokenOrThrow.mockResolvedValueOnce({
      uid: 'user-1',
      email: 'owner@example.test',
      admin: false,
    });
    const res = response();

    await sendEmailNotification(emailRequest({ token: 'user-token', type: 'approved' }), res as any);

    expect(res.statusCode).toBe(403);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('permite welcome solamente al correo verificado del propio usuario', async () => {
    mocks.verifyIdTokenOrThrow.mockResolvedValueOnce({
      uid: 'user-1',
      email: 'owner@example.test',
      email_verified: true,
      admin: false,
    });
    const res = response();

    await sendEmailNotification(emailRequest({
      token: 'user-token',
      type: 'welcome',
      to: 'OWNER@example.test',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(mocks.sendMail).toHaveBeenCalledOnce();
  });

  it('rechaza welcome cuando Firebase no confirma el correo', async () => {
    mocks.verifyIdTokenOrThrow.mockResolvedValueOnce({
      uid: 'user-1',
      email: 'owner@example.test',
      email_verified: false,
      admin: false,
    });
    const res = response();

    await sendEmailNotification(emailRequest({
      token: 'user-token',
      type: 'welcome',
      to: 'owner@example.test',
    }), res as any);

    expect(res.statusCode).toBe(403);
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('responde de forma genérica si falta EMAIL_PASS y no filtra configuración', async () => {
    vi.stubEnv('EMAIL_PASS', '');
    mocks.verifyIdTokenOrThrow.mockResolvedValueOnce({
      uid: 'admin-1',
      email: 'admin@example.test',
      admin: true,
    });
    const res = response();

    await sendEmailNotification(emailRequest({ token: 'admin-token' }), res as any);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Servicio de correo no disponible.' });
    expect(JSON.stringify(res.body)).not.toContain('EMAIL_PASS');
    expect(JSON.stringify(res.body)).not.toContain('test-only-password');
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it('los callers legítimos reenvían su token verificado', () => {
    const adminCaller = readFileSync(
      resolve(process.cwd(), 'pages/api/admin/review-business.ts'),
      'utf8',
    );
    const applicationCaller = readFileSync(
      resolve(process.cwd(), 'app/actions/businesses.ts'),
      'utf8',
    );

    const adminEmailCalls = adminCaller
      .split('fetch(`${baseUrl}/api/send-email-notification`')
      .slice(1);
    const applicationEmailCalls = applicationCaller
      .split('fetch(`${baseUrl}/api/send-email-notification`')
      .slice(1);

    expect(adminEmailCalls).toHaveLength(3);
    expect(applicationEmailCalls).toHaveLength(2);
    for (const call of adminEmailCalls) {
      expect(call.slice(0, 300)).toContain('Authorization: `Bearer ${token}`');
    }
    for (const call of applicationEmailCalls) {
      expect(call.slice(0, 300)).toContain('Authorization: `Bearer ${parsed.token}`');
    }
  });

  it('los archivos de texto versionados no conservan literales plausibles de CallMeBot', () => {
    const trackedTextFiles = execFileSync(
      'git',
      ['ls-files', '*.md', '*.ts', '*.tsx', '*.js', '*.json'],
      { cwd: process.cwd(), encoding: 'utf8' },
    )
      .split(/\r?\n/)
      .filter((file) => file && !/(^|\/)\.env($|\.)/.test(file));
    const trackedText = trackedTextFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(trackedText).not.toMatch(/CALLMEBOT_API_KEY\s*=\s*\d{5,}/i);
    expect(trackedText).not.toMatch(/apikey\s*=\s*\d{5,}/i);
    expect(trackedText).not.toMatch(/api\s*key\s*[:=]\s*\d{5,}/i);
  });
});

describe('Hotfix 0.2A.2: cron fail-closed', () => {
  afterEach(() => {
    vi.doUnmock('../lib/featureFlags');
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('el helper rechaza secreto ausente, header ausente y secreto incorrecto', () => {
    expect(isCronRequestAuthorized(undefined, undefined)).toBe(false);
    expect(isCronRequestAuthorized(undefined, 'configured-secret')).toBe(false);
    expect(isCronRequestAuthorized('Bearer wrong-secret', 'configured-secret')).toBe(false);
    expect(isCronRequestAuthorized('Bearer configured-secret', 'configured-secret')).toBe(true);
  });

  it.each([
    ['secreto ausente', '', 'Bearer anything'],
    ['secreto incorrecto', 'configured-secret', 'Bearer wrong-secret'],
  ])('ambos endpoints rechazan %s cuando una futura reactivación alcanza auth', async (_case, secret, authorization) => {
    vi.stubEnv('CRON_SECRET', secret);
    mocks.getAdminFirestore.mockImplementation(() => {
      throw new Error('Firestore must not be reached');
    });
    const handlers = await loadCronHandlers(true);

    for (const handler of handlers) {
      const res = response();
      await handler({ method: 'GET', headers: { authorization } } as any, res as any);
      expect(res.statusCode).toBe(401);
    }
    expect(mocks.getAdminFirestore).not.toHaveBeenCalled();
  });

  it('monetización apagada conserva 503 y cero side effects antes de auth', async () => {
    vi.stubEnv('CRON_SECRET', 'configured-secret');
    mocks.getAdminFirestore.mockImplementation(() => {
      throw new Error('Firestore must not be reached');
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const handlers = await loadCronHandlers(false);

    for (const handler of handlers) {
      const res = response();
      await handler({ method: 'GET', headers: {} } as any, res as any);
      expect(res.statusCode).toBe(503);
      expect(res.body.code).toBe('MONETIZATION_DISABLED');
    }
    expect(mocks.getAdminFirestore).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
