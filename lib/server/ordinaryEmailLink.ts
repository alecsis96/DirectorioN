import nodemailer from 'nodemailer';

import { safeInternalNext } from '../authRedirect';
import { getAdminAuth } from './firebaseAdmin';

/** Sends an ordinary Firebase sign-in link. It does not read or modify ownership data. */
export async function sendOrdinaryEmailSignInLink(
  email: string,
  baseUrl: string,
  nextPath = '/dashboard',
): Promise<void> {
  const next = encodeURIComponent(safeInternalNext(nextPath)).replace(/%2F/gi, '/');
  const continueUrl = new URL(`/entrar?flow=login&next=${next}`, baseUrl).href;
  const authLink = await getAdminAuth().generateSignInWithEmailLink(email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) return;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error('EMAIL_LINK_DELIVERY_NOT_CONFIGURED');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({
    from: `"YajaGon" <${user}>`,
    to: email,
    subject: 'Entra en YajaGon',
    text: `Entra en tu cuenta de YajaGon:\n\n${authLink}\n\nAbre el enlace en el navegador donde solicitaste el acceso.`,
    html: `<p>Entra en tu cuenta de YajaGon:</p><p><a href="${authLink}">Entrar en YajaGon</a></p><p>Abre el enlace en el navegador donde solicitaste el acceso.</p>`,
  });
}
