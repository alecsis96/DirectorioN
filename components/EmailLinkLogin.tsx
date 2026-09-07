'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, authPersistenceReady } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';
import { safeInternalNext } from '../lib/authRedirect';

async function emailRequest(body: object) {
  const response = await fetch('/api/login/email', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-YajaGon-Claim': '1' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error('LOGIN_UNAVAILABLE');
  return result;
}

export default function EmailLinkLogin({ initialEmail = '', emailLinkEnabled = true, nextPath = '/dashboard' }: {
  initialEmail?: string; emailLinkEnabled?: boolean; nextPath?: string;
}) {
  const router = useRouter();
  const safeNext = safeInternalNext(nextPath);
  const [email, setEmail] = useState(initialEmail), [password, setPassword] = useState('');
  const [knownEmail, setKnownEmail] = useState(Boolean(initialEmail));
  const emailEdited = useRef(false);
  const [emailReturn, setEmailReturn] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      await authPersistenceReady;
      await auth.authStateReady?.();
      if (!active) return;
      setEmailReturn(isSignInWithEmailLink(auth, window.location.href));
      if (auth.currentUser) {
        try {
          await writeSessionCookie(await auth.currentUser.getIdToken());
          router.replace(safeNext);
          router.refresh();
          return;
        } catch {
          setMessage('Tu sesión guardada venció. Entra de nuevo para continuar.');
        }
      }
      void emailRequest({ action: 'context' }).then(context => {
        if (active && !emailEdited.current) { setEmail(context.email); setKnownEmail(true); }
      }).catch(() => {});
    })().catch(() => {});
    return () => { active = false; };
  }, [router, safeNext]);
  async function enter() {
    setBusy(true); setMessage('');
    try {
      const credential = emailReturn
        ? await signInWithEmailLink(auth, email.trim(), window.location.href)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      await writeSessionCookie(await credential.user.getIdToken(true));
      // One App Router navigation also removes the OOB URL. A preceding native
      // replaceState races with Next's route restoration and can cancel this redirect.
      router.replace(safeNext);
      router.refresh();
    } catch { setMessage('No fue posible entrar. Verifica tus datos o solicita un enlace nuevo.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-white p-8">
    <h1 className="text-2xl font-bold">Entrar en YajaGon</h1>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void enter(); }}>
      {knownEmail ? <><p>{email}</p><button type="button" disabled={busy} onClick={() => {
        emailEdited.current = true; setKnownEmail(false); setEmail(''); setPassword(''); setEmailReturn(false);
        const next = encodeURIComponent(safeNext).replace(/%2F/gi, '/');
        window.history.replaceState(null, '', `/entrar?flow=login&next=${next}`);
      }}>Usar otro correo</button></> : <><label htmlFor="login-email">Correo electrónico</label>
        <input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => {
          emailEdited.current = true; setEmail(e.target.value);
        }} className="w-full rounded border p-3" /></>}
      {!emailReturn && <><label htmlFor="login-password">Contraseña</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border p-3" /></>}
      <button disabled={busy} className="rounded bg-emerald-700 px-5 py-3 text-white">{emailReturn ? 'Completar acceso' : 'Entrar'}</button>
    </form>
    {!emailReturn && emailLinkEnabled && <button disabled={busy || !email.trim()} className="font-semibold text-emerald-700" onClick={async () => {
      setBusy(true);
      try { await emailRequest({ action: 'request', email, next: safeNext }); setMessage('Si la cuenta permite este acceso, recibirás un enlace en tu correo.'); }
      catch { setMessage('No fue posible solicitar el enlace. Intenta de nuevo.'); }
      finally { setBusy(false); }
    }}>Recibir enlace para entrar</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
