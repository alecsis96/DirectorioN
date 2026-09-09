'use client';

import { useEffect, useState } from 'react';
import { linkWithPopup, reload, updatePassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';

function validPassword(value: string) {
  return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export default function ClaimGoogleLink({ ownerId, businessId, accountCreatedByClaim }: {
  ownerId: string; businessId: string; accountCreatedByClaim: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [creatingPassword, setCreatingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void auth.authStateReady().then(() => {
      const user = auth.currentUser;
      if (!active || user?.uid !== ownerId) return;
      setGoogleLinked(user.providerData.some(provider => provider.providerId === 'google.com'));
      setReady(true);
    });
    return () => { active = false; };
  }, [ownerId]);

  async function refreshSession() {
    const user = auth.currentUser;
    if (!user || user.uid !== ownerId) throw new Error('SESSION_REQUIRED');
    await reload(user);
    if (auth.currentUser?.uid !== ownerId) throw new Error('UID_CHANGED');
    await writeSessionCookie(await user.getIdToken(true));
    setGoogleLinked(user.providerData.some(provider => provider.providerId === 'google.com'));
  }

  async function sendRecentLoginLink() {
    const user = auth.currentUser;
    if (!user?.email || user.uid !== ownerId) throw new Error('SESSION_REQUIRED');
    const response = await fetch('/api/login/email', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-YajaGon-Claim': '1' },
      body: JSON.stringify({ action: 'request', email: user.email, next: `/dashboard/${encodeURIComponent(businessId)}` }),
    });
    if (!response.ok) throw new Error('EMAIL_LINK_UNAVAILABLE');
    setMessage('Te enviamos un enlace a tu correo. Ábrelo para volver y crear tu contraseña.');
  }

  async function createPassword() {
    setMessage('');
    if (!validPassword(password)) {
      setMessage('Usa al menos 10 caracteres, con mayúscula, minúscula y número.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    const user = auth.currentUser;
    if (!accountCreatedByClaim || !user?.email || user.uid !== ownerId) {
      setMessage('Vuelve a entrar para modificar la seguridad de tu cuenta.');
      return;
    }
    setBusy(true);
    try {
      const uid = user.uid;
      await updatePassword(user, password);
      if (auth.currentUser?.uid !== uid) throw new Error('UID_CHANGED');
      await refreshSession();
      setPasswordCreated(true);
      setCreatingPassword(false); setPassword(''); setConfirmation('');
      setMessage('Contraseña creada. Ya puedes usarla en tu próximo acceso.');
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        try { await sendRecentLoginLink(); }
        catch { setMessage('Tu sesión necesita renovarse. Solicita un enlace desde la pantalla de acceso.'); }
      } else if (['auth/credential-already-in-use', 'auth/email-already-in-use'].includes(error?.code)) {
        setMessage('Ese acceso pertenece a otra cuenta. No se vinculó ni se cambió la propiedad del negocio.');
      } else {
        setMessage('No pudimos crear la contraseña. Tu cuenta y tu negocio no cambiaron.');
      }
    } finally { setBusy(false); }
  }

  async function linkGoogle() {
    const user = auth.currentUser;
    if (!user || user.uid !== ownerId || googleLinked) return;
    setBusy(true); setMessage('');
    try {
      const uid = user.uid;
      await linkWithPopup(user, googleProvider);
      if (auth.currentUser?.uid !== uid) throw new Error('UID_CHANGED');
      await refreshSession();
      setGoogleLinked(true);
      setMessage('Google quedó vinculado a esta misma cuenta.');
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        try { await sendRecentLoginLink(); }
        catch { setMessage('Tu sesión necesita renovarse. Solicita un enlace desde la pantalla de acceso.'); }
      } else if (['auth/credential-already-in-use', 'auth/account-exists-with-different-credential', 'auth/email-already-in-use'].includes(error?.code)) {
        setMessage('Esa cuenta de Google ya pertenece a otro usuario. No fusionamos cuentas ni cambiamos la propiedad del negocio.');
      } else {
        setMessage('No se pudo vincular Google. Tu negocio sigue en tu cuenta; puedes continuar.');
      }
    } finally { setBusy(false); }
  }

  const offerPassword = accountCreatedByClaim && !passwordCreated;
  if (dismissed || (!ready && !message) || (!offerPassword && googleLinked && !message)) return null;
  return <aside className="mx-auto my-3 max-w-6xl rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
    <h2 className="text-sm font-bold text-gray-900">{accountCreatedByClaim ? 'Protege tu cuenta' : 'Acceso a tu cuenta'}</h2>
    {offerPassword && <p className="mt-0.5 text-xs text-gray-600">Crea una contraseña para entrar fácilmente la próxima vez.</p>}

    {creatingPassword && offerPassword && <form className="mt-4 grid max-w-md gap-3" onSubmit={event => { event.preventDefault(); void createPassword(); }}>
      <label htmlFor="new-password">Nueva contraseña</label>
      <input id="new-password" type="password" autoComplete="new-password" minLength={10} required value={password}
        onChange={event => setPassword(event.target.value)} className="rounded-lg border p-3" />
      <label htmlFor="confirm-password">Confirmar contraseña</label>
      <input id="confirm-password" type="password" autoComplete="new-password" minLength={10} required value={confirmation}
        onChange={event => setConfirmation(event.target.value)} className="rounded-lg border p-3" />
      <button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white">Guardar contraseña</button>
    </form>}

    {!creatingPassword && ready && <div className="mt-2 flex flex-wrap gap-2 text-sm">
      {offerPassword && <button disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white" onClick={() => { setCreatingPassword(true); setMessage(''); }}>Crear contraseña</button>}
      {!googleLinked && <button disabled={busy} className="rounded-lg border border-emerald-700 px-3 py-2 font-semibold text-emerald-700" onClick={() => void linkGoogle()}>Vincular Google</button>}
      <button disabled={busy} className="px-2 py-2 text-gray-600" onClick={() => setDismissed(true)}>Ahora no</button>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
  </aside>;
}
