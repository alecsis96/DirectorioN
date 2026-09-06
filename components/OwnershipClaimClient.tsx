'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithCustomToken, signInWithEmailLink, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';
import EmailLinkLogin from './EmailLinkLogin';

const messages: Record<string, string> = {
  ATTEMPT_MISSING: 'Abre la invitación original para confirmar el acceso. No se ha asignado la propiedad.',
  ATTEMPT_EXPIRED: 'La confirmación venció. Vuelve a abrir la invitación original y confirma de nuevo.',
  ATTEMPT_IN_PROGRESS: 'Esta invitación tiene una confirmación en curso. Continúa en el mismo navegador o espera diez minutos.',
  CLAIM_EXPIRED: 'Esta invitación venció. Solicita una nueva al administrador.',
  CLAIM_REVOKED: 'Esta invitación fue reemplazada. Abre la invitación más reciente.',
  CLAIM_ALREADY_USED: 'Esta invitación ya fue utilizada. Entra con tu cuenta para administrar el negocio.',
  BUSINESS_ALREADY_CLAIMED: 'Este negocio ya tiene propietario.',
  CLAIM_IDENTITY_UNAVAILABLE: 'No podemos activar esta cuenta mediante la invitación. Contacta con soporte.',
  IDENTITY_PENDING: 'Estamos comprobando la creación de la cuenta. Intenta continuar de nuevo.',
  EMAIL_COOLDOWN: 'Ya enviamos un enlace. Espera un minuto antes de solicitar otro.',
  EMAIL_LINK_AUTH_DISABLED: 'El acceso por enlace no está disponible. Usa tu contraseña.',
  CLAIM_INVALID: 'La invitación no es válida. Vuelve a abrir el correo original.',
};

async function request(operation: string, body: object = {}, user?: User) {
  const idToken = user ? await user.getIdToken(true) : '';
  const response = await fetch(`/api/ownership-claims/${operation}`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-YajaGon-Claim': '1',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.code || 'CLAIM_OPERATION_FAILED');
  return result;
}

export default function OwnershipClaimClient({ enabled, login = false, emailLinkEnabled = true }: {
  enabled: boolean; login?: boolean; emailLinkEnabled?: boolean;
}) {
  const router = useRouter();
  const token = useRef('');
  const initialized = useRef(false);
  const running = useRef(false);
  const [view, setView] = useState<'loading' | 'confirm' | 'login' | 'busy' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [emailReturn, setEmailReturn] = useState(false);
  const [standalone, setStandalone] = useState(false);

  async function finish(user: User) {
    const result = await request('complete', {}, user);
    writeSessionCookie(await user.getIdToken(true));
    router.replace(`/dashboard/${encodeURIComponent(result.businessId)}`);
  }

  async function resume(prepare = false) {
    if (prepare) {
      const result = await request('prepare');
      if (result.status === 'bootstrap') {
        const credential = await signInWithCustomToken(auth, result.customToken);
        await finish(credential.user);
        return;
      }
    }
    let context: any;
    try { context = await request('status'); }
    catch (failure) {
      if (login && failure instanceof Error && ['ATTEMPT_MISSING', 'ATTEMPT_EXPIRED'].includes(failure.message)) {
        setStandalone(true); return;
      }
      throw failure;
    }
    if (context.status === 'pending') { await resume(true); return; }
    const user = auth.currentUser;
    if (user && user.uid === context.targetUid && user.emailVerified && user.email?.toLowerCase() === context.email) {
      await finish(user);
      return;
    }
    // Recover a lost bootstrap response after reload; the server alone checks creation provenance.
    if (!prepare && context.status === 'ready') { await resume(true); return; }
    if (login && context.status === 'completed') { setEmail(context.email); setStandalone(true); return; }
    if (!login) { router.replace('/entrar'); return; }
    setEmail(context.email);
    setEmailReturn(isSignInWithEmailLink(auth, window.location.href));
    setView('login');
  }

  async function act(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setError('');
    setView('busy');
    try { await work(); }
    catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      setError(messages[code] || 'No fue posible continuar. Verifica tus datos e intenta de nuevo.');
      setView(login && email ? 'login' : 'error');
    } finally { running.current = false; }
  }

  useEffect(() => {
    // StrictMode can replay after the URL was cleaned. Capture the secret only once.
    if (initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if (fragment) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!enabled) return;
    token.current = fragment;
    void act(async () => {
      await auth.authStateReady();
      setCurrentEmail(auth.currentUser?.email || '');
      if (fragment) { setView('confirm'); return; }
      // Only an already confirmed HttpOnly-bound attempt can resume after navigation.
      await resume();
    });
  }, [enabled]);

  async function confirm() {
    await act(async () => {
      await request('begin', { token: token.current, confirmed: true });
      token.current = '';
      await resume(true);
    });
  }

  if ((login && !enabled) || standalone) return <EmailLinkLogin initialEmail={email} emailLinkEnabled={emailLinkEnabled} />;
  if (!enabled) return <Card><h1>Reclamación no disponible</h1><p>Abrir esta página no consume tu invitación.</p></Card>;
  return (
    <Card>
      <h1 className="text-2xl font-bold text-gray-900">{login ? 'Entrar en YajaGon' : 'Administra tu negocio'}</h1>
      {view === 'confirm' && <>
        <p>Activaremos el acceso con la cuenta del correo que recibió esta invitación.</p>
        {currentEmail && <p className="text-sm">Tienes abierta la cuenta {currentEmail}. Tu sesión cambiará si esta invitación corresponde a otra cuenta.</p>}
        <button className="claim-button" onClick={confirm}>Confirmar y entrar</button>
      </>}
      {(view === 'loading' || view === 'busy') && <p role="status">Preparando tu acceso…</p>}
      {view === 'login' && <>
        <p>Ya existe una cuenta de YajaGon con <strong>{email}</strong>. Entra con su contraseña actual o solicita un enlace. Tu confirmación se conserva durante diez minutos.</p>
        {emailReturn ? <button className="claim-button" onClick={() => act(async () => {
          const credential = await signInWithEmailLink(auth, email, window.location.href);
          window.history.replaceState(null, '', '/entrar');
          await finish(credential.user);
        })}>Completar acceso</button> : <>
          <form onSubmit={event => { event.preventDefault(); void act(async () => {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            setPassword('');
            await finish(credential.user);
          }); }} className="space-y-3 text-left">
            <label htmlFor="claim-password">Contraseña</label>
            <input id="claim-password" type="password" autoComplete="current-password" required value={password}
              onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border p-3" />
            <button className="claim-button" type="submit">Entrar</button>
          </form>
          {emailLinkEnabled && <button className="claim-button" onClick={() => act(async () => {
            await request('login-email'); setSent(true); setView('login');
          })}>Recibir enlace para entrar</button>}
          {sent && <p role="status">Revisa tu correo. Abre el enlace en este navegador; puede ser en otra pestaña.</p>}
        </>}
      </>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {view === 'error' && <button className="claim-button" onClick={() => token.current ? confirm() : act(() => resume(true))}>Intentar de nuevo</button>}
      <style jsx>{`.claim-button {display:block;width:100%;padding:12px 20px;border-radius:8px;background:#047857;color:white;font-weight:600;margin-top:12px}`}</style>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-xl space-y-5 rounded-2xl border bg-white p-8 text-center text-gray-600 shadow-sm">
    <p className="text-sm font-semibold text-emerald-700">YajaGon</p>{children}
  </section>;
}
