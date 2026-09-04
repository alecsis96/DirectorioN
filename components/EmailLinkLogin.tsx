'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';

async function emailRequest(body: object) {
  const response = await fetch('/api/login/email', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-YajaGon-Claim': '1' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error('LOGIN_UNAVAILABLE');
  return result;
}

export default function EmailLinkLogin({ initialEmail = '', emailLinkEnabled = true }: { initialEmail?: string; emailLinkEnabled?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail), [password, setPassword] = useState('');
  const [knownEmail, setKnownEmail] = useState(Boolean(initialEmail));
  const emailEdited = useRef(false);
  const [emailReturn, setEmailReturn] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    setEmailReturn(isSignInWithEmailLink(auth, window.location.href));
    void emailRequest({ action: 'context' }).then(context => {
      if (!emailEdited.current) { setEmail(context.email); setKnownEmail(true); }
    }).catch(() => {});
  }, []);
  async function enter() {
    setBusy(true); setMessage('');
    try {
      const credential = emailReturn
        ? await signInWithEmailLink(auth, email.trim(), window.location.href)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      writeSessionCookie(await credential.user.getIdToken(true));
      // One App Router navigation also removes the OOB URL. A preceding native
      // replaceState races with Next's route restoration and can cancel this redirect.
      router.replace('/dashboard');
    } catch { setMessage('No fue posible entrar. Verifica tus datos o solicita un enlace nuevo.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-white p-8">
    <h1 className="text-2xl font-bold">Entrar en YajaGon</h1>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void enter(); }}>
      {knownEmail ? <><p>{email}</p><button type="button" disabled={busy} onClick={() => {
        emailEdited.current = true; setKnownEmail(false); setEmail(''); setPassword(''); setEmailReturn(false);
        window.history.replaceState(null, '', '/entrar?flow=login');
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
      try { await emailRequest({ action: 'request', email }); setMessage('Si la cuenta permite este acceso, recibirás un enlace en tu correo.'); }
      catch { setMessage('No fue posible solicitar el enlace. Intenta de nuevo.'); }
      finally { setBusy(false); }
    }}>Recibir enlace para entrar</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
