// components/Providers.tsx
'use client';

import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { FavoritesProvider } from '../context/FavoritesContext';
import { auth, authPersistenceReady } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void authPersistenceReady.then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          await writeSessionCookie(user ? await user.getIdToken() : undefined);
        } catch {
          // A stale persisted Firebase session must not be treated as a server session.
          if (user) await writeSessionCookie().catch(() => {});
        }
      });
    }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);

  return (
    <>
      <FavoritesProvider>{children}</FavoritesProvider>
    </>
  );
}
