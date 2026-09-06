// components/Providers.tsx
'use client';

import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { FavoritesProvider } from '../context/FavoritesContext';
import { auth } from '../firebaseConfig';
import { writeSessionCookie } from '../lib/sessionCookie';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        writeSessionCookie();
        return;
      }
      try {
        const token = await user.getIdToken();
        writeSessionCookie(token);
      } catch {
        writeSessionCookie();
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <FavoritesProvider>{children}</FavoritesProvider>
    </>
  );
}
