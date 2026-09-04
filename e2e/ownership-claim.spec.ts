import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { randomBytes, createHash } from 'node:crypto';

const projectId = 'demo-claim-e2e';
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') {
  throw new Error('These tests must never connect to production. Start both local emulators.');
}
const app = initializeApp({ projectId }, 'claim-e2e');
const db = getFirestore(app), auth = getAuth(app);
const password = 'Only-for-local-tests-123!';

test.beforeAll(async ({ request }) => {
  // Compile the shared API route before measuring user interactions on the dev server.
  const response = await request.post('/api/ownership-claims/status', {
    headers: { Origin: 'http://localhost:3100', 'X-YajaGon-Claim': '1' }, data: {}, timeout: 90_000,
  });
  expect(response.status()).toBe(401);
});
test.beforeEach(async ({ page }) => {
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/ownership-claims/')) console.info('claim HTTP', url.pathname, response.status());
  });
});

async function fixture(email = `claim-${randomBytes(6).toString('hex')}@example.com`) {
  const token = randomBytes(32).toString('base64url');
  const businessId = `business-${randomBytes(6).toString('hex')}`;
  const applicationId = `app-${businessId}`, claimId = `claim-${businessId}`;
  const batch = db.batch();
  batch.set(db.doc(`businesses/${businessId}`), {
    name: 'Negocio E2E', businessName: 'Negocio E2E', applicationSchemaVersion: 2, sourceApplicationId: applicationId,
    businessStatus: 'draft', visibility: 'hidden', category: 'Otros', plan: 'free', ownerEmail: email,
  });
  batch.set(db.doc(`applications/${applicationId}`), { schemaVersion: 2, status: 'approved', businessId, ownerEmail: email });
  batch.set(db.doc(`ownershipClaims/${claimId}`), {
    tokenHash: createHash('sha256').update(token).digest('hex'), businessId, applicationId,
    emailNormalized: email, status: 'active', version: 1, expiresAt: new Date(Date.now() + 7 * 86400_000),
  });
  batch.set(db.doc(`ownershipClaimGuards/${businessId}`), { businessId, activeClaimId: claimId, version: 1 });
  await batch.commit();
  return { email, businessId, claimId, invitation: `/reclamar-negocio#token=${token}` };
}

test('new user: real navigation, explicit confirmation, one UID and dashboard', async ({ page, context, browser, request }) => {
  test.setTimeout(120_000);
  const data = await fixture();
  await page.goto(data.invitation);
  await expect(page.getByRole('button', { name: 'Confirmar y entrar' })).toBeVisible();
  await expect(auth.getUserByEmail(data.email)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  expect((await db.doc(`ownershipClaims/${data.claimId}`).get()).data()?.status).toBe('active');
  expect(await page.evaluate(() => window.location.hash)).toBe('');
  const prepared = page.waitForResponse(r => r.url().endsWith('/ownership-claims/prepare'));
  await page.getByRole('button', { name: 'Confirmar y entrar' }).click();
  expect(await (await prepared).json()).toMatchObject({ ok: true, status: 'bootstrap' });
  await expect(page).toHaveURL(new RegExp(`/dashboard/${data.businessId}$`));
  const user = await auth.getUserByEmail(data.email);
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBe(user.uid);
  expect((await db.doc(`ownershipClaims/${data.claimId}`).get()).data()?.status).toBe('consumed');
  const cookie = (await context.cookies()).find(c => c.name === '__Host-ownershipClaimAttempt');
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('ownershipClaimAttempt');
  await page.getByRole('button', { name: 'Ahora no', exact: true }).click();
  // An owner who skips Google must still be able to sign in after the claim attempt expires.
  const attempts = await db.collection('ownershipClaimAttempts').where('claimId', '==', data.claimId).get();
  await attempts.docs[0].ref.update({ expiresAt: new Date(Date.now() - 1) });
  const cleanContext = await browser.newContext();
  const login = await cleanContext.newPage();
  await login.goto('http://localhost:3100/entrar?flow=login');
  await login.getByLabel('Correo electrónico', { exact: true }).fill(data.email);
  await login.getByRole('button', { name: 'Recibir enlace para entrar' }).click();
  await expect(login.getByText(/Si la cuenta permite este acceso/)).toBeVisible();
  const codes = await (await request.get(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`)).json();
  const link = codes.oobCodes.filter((c: any) => c.email === data.email).at(-1).oobLink;
  expect(link).not.toContain('#token');
  const returnTab = await cleanContext.newPage();
  await returnTab.goto(link);
  await returnTab.getByRole('button', { name: 'Completar acceso' }).click();
  await expect(returnTab).toHaveURL(/\/dashboard$/);
  expect((await auth.getUserByEmail(data.email)).uid).toBe(user.uid);
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBe(user.uid);
  await cleanContext.close();
});

test('existing account: new tab + reload + empty web storage retains attempt, requires real password login', async ({ page, context }) => {
  const data = await fixture();
  const existing = await auth.createUser({ email: data.email, password, emailVerified: true });
  await db.doc(`businesses/previous-${data.businessId}`).set({ ownerId: existing.uid, applicationSchemaVersion: 1 });
  await page.goto(data.invitation);
  const prepared = page.waitForResponse(r => r.url().endsWith('/ownership-claims/prepare'));
  await page.getByRole('button', { name: 'Confirmar y entrar' }).click();
  expect(await (await prepared).json()).toEqual({ ok: true, status: 'login' });
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBeUndefined();
  const newTab = await context.newPage();
  await newTab.goto('/entrar');
  await newTab.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await newTab.reload();
  await expect(newTab.getByRole('heading', { name: 'Entrar en YajaGon' })).toBeVisible();
  await expect(newTab.getByText(data.email, { exact: true })).toBeVisible();
  expect(await newTab.locator('input[type=email]').count()).toBe(0);
  await newTab.getByLabel('Contraseña', { exact: true }).fill(password);
  await newTab.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(newTab).toHaveURL(new RegExp(`/dashboard/${data.businessId}$`));
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBe(existing.uid);
  expect((await db.doc(`businesses/previous-${data.businessId}`).get()).data()?.ownerId).toBe(existing.uid);
  // With that legitimate Firebase session, the next claim must skip login and never mint a custom token.
  const next = await fixture(data.email);
  await newTab.goto(next.invitation);
  const secondPreparation = newTab.waitForResponse(r => r.url().endsWith('/ownership-claims/prepare'));
  await newTab.getByRole('button', { name: 'Confirmar y entrar' }).click();
  expect(await (await secondPreparation).json()).toEqual({ ok: true, status: 'login' });
  await expect(newTab).toHaveURL(new RegExp(`/dashboard/${next.businessId}$`));
});

test('real Firebase email action returns in another tab without any claim fragment', async ({ page, context, request }) => {
  const data = await fixture();
  const existing = await auth.createUser({ email: data.email, emailVerified: true });
  await page.goto(data.invitation);
  await page.getByRole('button', { name: 'Confirmar y entrar' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('button', { name: 'Recibir enlace para entrar' }).click();
  await expect(page.getByText(/Revisa tu correo/)).toBeVisible();
  // This is the actual OOB link generated by the production email generator against Auth emulator.
  const response = await request.get(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`);
  const codes = (await response.json()).oobCodes;
  const code = codes.filter((c: any) => c.email === data.email).at(-1);
  expect(code).toBeTruthy();
  expect(code.oobLink).not.toContain('#token');
  const newTab = await context.newPage();
  await newTab.goto('/entrar');
  await newTab.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await newTab.goto(code.oobLink);
  await expect(newTab.getByRole('button', { name: 'Completar acceso' })).toBeVisible();
  await newTab.reload();
  await newTab.getByRole('button', { name: 'Completar acceso' }).click();
  await expect(newTab).toHaveURL(new RegExp(`/dashboard/${data.businessId}$`));
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBe(existing.uid);
});

test('real Firestore concurrency: two browsers cannot create two accounts or owners', async ({ browser }) => {
  const data = await fixture();
  const first = await browser.newContext(), second = await browser.newContext();
  const pages = await Promise.all([first.newPage(), second.newPage()]);
  const operations: object[] = [];
  pages.forEach((p, browserIndex) => p.on('response', async response => {
    const operation = new URL(response.url()).pathname;
    if (!operation.startsWith('/api/ownership-claims/')) return;
    const body = await response.json().catch(() => ({}));
    operations.push({ browserIndex, operation, httpStatus: response.status(), status: body.status, code: body.code });
  }));
  await Promise.all(pages.map(p => p.goto(`http://localhost:3100${data.invitation}`)));
  const confirmations = pages.map(p => p.waitForResponse(r => r.url().endsWith('/ownership-claims/begin')));
  await Promise.all(pages.map(p => p.getByRole('button', { name: 'Confirmar y entrar' }).click()));
  expect((await Promise.all(confirmations)).map(r => r.status()).sort()).toEqual([200, 409]);
  try {
    await expect.poll(async () => (await db.doc(`ownershipClaims/${data.claimId}`).get()).data()?.status).toBe('consumed');
  } catch (error) {
    // Diagnostics intentionally exclude cookies, invitation tokens and custom tokens.
    console.info('concurrent claim operations', operations);
    throw error;
  }
  const user = await auth.getUserByEmail(data.email);
  expect((await db.doc(`businesses/${data.businessId}`).get()).data()?.ownerId).toBe(user.uid);
  const attempts = await db.collection('ownershipClaimAttempts').where('claimId', '==', data.claimId).get();
  expect(attempts.size).toBe(1);
  const audits = await db.collection('ownershipClaimAudits').where('claimId', '==', data.claimId).get();
  expect(audits.size).toBe(1);
  await first.close(); await second.close();
});
