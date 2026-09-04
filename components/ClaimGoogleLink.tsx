'use client';

import { useEffect, useState } from 'react';
import { linkWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';

export default function ClaimGoogleLink({ ownerId }: { ownerId: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void auth.authStateReady().then(() => setVisible(auth.currentUser?.uid === ownerId &&
      !auth.currentUser.providerData.some(provider => provider.providerId === 'google.com')));
  }, [ownerId]);
  if (!visible) return null;
  return <aside className="mx-auto my-4 max-w-5xl rounded-lg border bg-white p-4">
    <p>Facilita tus próximos accesos vinculando Google.</p>
    <button disabled={busy} className="mr-4 font-semibold text-emerald-700" onClick={async () => {
      const user = auth.currentUser;
      if (user?.uid !== ownerId) return;
      setBusy(true);
      try { await linkWithPopup(user, googleProvider); setVisible(false); }
      catch { setMessage('No se pudo vincular Google. Tu negocio sigue en tu cuenta; puedes continuar.'); }
      finally { setBusy(false); }
    }}>Vincular Google</button>
    <button disabled={busy} onClick={() => setVisible(false)}>Ahora no</button>
    {message && <p role="status">{message}</p>}
  </aside>;
}
