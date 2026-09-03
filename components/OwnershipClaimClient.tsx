'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  type User,
} from 'firebase/auth';

import { auth, googleProvider } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';

const TRANSIENT_TOKEN_KEY = 'yajagon.pendingOwnershipClaimToken';

type ViewState =
  | 'ready'
  | 'sending-email'
  | 'email-sent'
  | 'completing-email'
  | 'redeeming'
  | 'success'
  | 'disabled'
  | 'error';

const messages: Record<string, string> = {
  CLAIM_EMAIL_NOT_VERIFIED: 'Tu correo de Firebase aún no está verificado.',
  CLAIM_EMAIL_MISMATCH: 'La cuenta autenticada no corresponde a esta invitación.',
  CLAIM_EXPIRED: 'Esta invitación venció. Solicita una nueva al administrador.',
  CLAIM_REVOKED: 'Esta invitación fue revocada. Usa la invitación más reciente.',
  CLAIM_ALREADY_USED: 'Esta invitación ya fue utilizada por otra cuenta.',
  BUSINESS_ALREADY_CLAIMED: 'Este negocio ya fue reclamado.',
  CLAIM_INVALID: 'La invitación no es válida.',
  CLAIM_TOKEN_INVALID: 'La invitación no es válida.',
  OWNERSHIP_CLAIMS_DISABLED: 'La reclamación de negocios no está disponible.',
  AUTHENTICATION_REQUIRED: 'Inicia sesión para continuar.',
};

function cleanBrowserUrl(removeSearch = false) {
  const next = removeSearch ? window.location.pathname : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', next);
}

function tokenFromFragment(): string {
  const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(fragment).get('token')?.trim() || '';
}

export default function OwnershipClaimClient({ enabled }: { enabled: boolean }) {
  const tokenRef = useRef('');
  const [state, setState] = useState<ViewState>(enabled ? 'ready' : 'disabled');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [emailLinkPending, setEmailLinkPending] = useState(false);
  const [signedInUser, setSignedInUser] = useState<User | null>(null);

  useEffect(() => {
    const fragmentToken = tokenFromFragment();
    let transientToken = '';
    try {
      transientToken = window.sessionStorage.getItem(TRANSIENT_TOKEN_KEY) || '';
      window.sessionStorage.removeItem(TRANSIENT_TOKEN_KEY);
    } catch {
      // El flujo sigue funcionando al reabrir la invitación si el navegador bloquea sessionStorage.
    }
    if (fragmentToken) cleanBrowserUrl();
    if (!enabled) {
      tokenRef.current = '';
      return;
    }
    if (fragmentToken) {
      tokenRef.current = fragmentToken;
    } else {
      tokenRef.current = transientToken;
    }
    setSignedInUser(auth.currentUser);
    setEmailLinkPending(isSignInWithEmailLink(auth, window.location.href));
  }, [enabled]);

  async function redeem(user: User) {
    if (!tokenRef.current) {
      setState('error');
      setErrorMessage(
        'La autenticación terminó, pero falta la invitación. Vuelve a abrir el correo original de reclamación.',
      );
      return;
    }
    if (!user.emailVerified) {
      setState('error');
      setErrorMessage(messages.CLAIM_EMAIL_NOT_VERIFIED);
      return;
    }

    setState('redeeming');
    try {
      const idToken = await user.getIdToken(true);
      writeSessionCookie(idToken);
      const response = await fetch('/api/ownership-claims/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token: tokenRef.current }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
        businessId?: string;
      };
      if (!response.ok || !payload.ok || !payload.businessId) {
        throw new Error(messages[payload.code || ''] || 'No fue posible completar la reclamación.');
      }
      tokenRef.current = '';
      try {
        window.sessionStorage.removeItem(TRANSIENT_TOKEN_KEY);
      } catch {}
      cleanBrowserUrl(true);
      setBusinessId(payload.businessId);
      setState('success');
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error && Object.values(messages).includes(error.message)
          ? error.message
          : 'No fue posible completar la reclamación.',
      );
    }
  }

  async function continueWithGoogle() {
    setErrorMessage('');
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await redeem(credential.user);
    } catch {
      setState('error');
      setErrorMessage('No fue posible iniciar sesión con Google. Intenta de nuevo.');
    }
  }

  async function sendEmailLink() {
    if (!tokenRef.current) {
      setState('error');
      setErrorMessage('Falta la invitación. Vuelve a abrir el correo original de reclamación.');
      return;
    }
    setState('sending-email');
    try {
      const validation = await fetch('/api/ownership-claims/email-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current }),
      });
      if (!validation.ok) {
        throw new Error('INVITATION_NOT_AVAILABLE');
      }
      // Única persistencia transitoria necesaria para volver del salto de Firebase en la misma pestaña.
      // No guardamos el correo ni incluimos el token en la URL del enlace de autenticación.
      try {
        window.sessionStorage.setItem(TRANSIENT_TOKEN_KEY, tokenRef.current);
      } catch {
        // En navegadores restrictivos se pedirá reabrir la invitación tras autenticar.
      }
      setState('email-sent');
    } catch {
      try {
        window.sessionStorage.removeItem(TRANSIENT_TOKEN_KEY);
      } catch {}
      setState('error');
      setErrorMessage('No fue posible enviar el enlace. Verifica el correo e intenta de nuevo.');
    }
  }

  async function completeEmailLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage('Vuelve a escribir el correo que recibió la invitación.');
      return;
    }
    setState('completing-email');
    try {
      const credential = await signInWithEmailLink(auth, normalizedEmail, window.location.href);
      cleanBrowserUrl(true);
      setEmailLinkPending(false);
      await redeem(credential.user);
    } catch {
      setState('error');
      setErrorMessage('No fue posible completar el acceso por correo. Solicita un enlace nuevo.');
    }
  }

  if (state === 'disabled') {
    return (
      <ClaimCard title="Reclamación no disponible">
        <p>La activación segura del acceso aún no está habilitada. Abrir esta página no consume tu invitación.</p>
      </ClaimCard>
    );
  }

  if (state === 'success') {
    return (
      <ClaimCard title="Negocio reclamado">
        <p>Tu cuenta ya es la propietaria. Ahora puedes completar y administrar el perfil.</p>
        <Link
          href={`/dashboard/${encodeURIComponent(businessId)}`}
          className="mt-6 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
        >
          Ir a mi dashboard
        </Link>
      </ClaimCard>
    );
  }

  return (
    <ClaimCard title="Reclama tu negocio">
      <p>Autentícate con el correo que recibió la invitación. La propiedad sólo se asignará después de validar ambos accesos.</p>

      {emailLinkPending ? (
        <div className="mt-6 text-left">
          <label className="block text-sm font-medium text-gray-800" htmlFor="claim-email">
            Correo que recibió la invitación
          </label>
          <input
            id="claim-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={completeEmailLink}
            disabled={state === 'completing-email' || state === 'redeeming'}
            className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {state === 'completing-email' ? 'Validando…' : 'Completar acceso por correo'}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3 text-left">
          {signedInUser ? (
            <button
              type="button"
              onClick={() => redeem(signedInUser)}
              disabled={state === 'redeeming'}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              Confirmar reclamación con mi sesión
            </button>
          ) : null}
          <p className="text-sm text-gray-600">
            Enviaremos el enlace al correo asociado de forma segura con esta invitación.
          </p>
          <button
            type="button"
            onClick={sendEmailLink}
            disabled={state === 'sending-email' || state === 'redeeming'}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {state === 'sending-email' ? 'Enviando…' : 'Continuar por correo'}
          </button>
          <div className="flex items-center gap-3 py-1 text-xs uppercase text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />o<span className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={state === 'redeeming'}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-800 disabled:opacity-60"
          >
            Continuar con Google
          </button>
        </div>
      )}

      {state === 'email-sent' ? (
        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Revisa tu correo y abre el enlace de Firebase en este navegador. Si usas otro dispositivo,
          vuelve a abrir después la invitación original.
        </p>
      ) : null}
      {state === 'redeeming' ? <p className="mt-5 text-sm text-gray-600">Asignando acceso de forma segura…</p> : null}
      {errorMessage ? (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </ClaimCard>
  );
}

function ClaimCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">YajaGon</p>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">{title}</h1>
      <div className="mt-4 text-gray-600">{children}</div>
    </section>
  );
}
