// hooks/useAuth.ts
// Hook reutilizable para gestión de autenticación y detección de admin

import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, authPersistenceReady } from "../firebaseConfig";
import { writeSessionCookie } from "../lib/sessionCookie";

/**
 * Hook personalizado para gestionar el estado de autenticación
 * Detecta automáticamente si el usuario tiene privilegios de admin
 * 
 * @returns {object} Estado de autenticación
 * @returns {User | null} user - Usuario autenticado o null
 * @returns {boolean} isAdmin - True si el usuario tiene el claim 'admin'
 * @returns {boolean} loading - True mientras se verifica la autenticación
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void authPersistenceReady.then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setIsAdmin(false);
        try {
          const state = await writeSessionCookie(currentUser ? await currentUser.getIdToken() : undefined);
          if (active) setIsAdmin(currentUser !== null && state.isAdmin === true);
        } catch {
          if (active) setIsAdmin(false);
        } finally {
          if (active) setLoading(false);
        }
      });
    }).catch(() => { if (active) setLoading(false); });

    return () => { active = false; unsubscribe(); };
  }, []);

  return { user, isAdmin, loading };
}

/**
 * Hook simplificado que solo retorna el usuario actual
 * Útil cuando no necesitas verificar permisos de admin
 * 
 * @returns {User | null} Usuario autenticado o null
 */
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void authPersistenceReady.then(() => {
      if (active) unsubscribe = onAuthStateChanged(auth, setUser);
    }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);

  return user;
}

/**
 * Verifica si el usuario actual puede editar un negocio específico
 * El ownership autenticado depende exclusivamente de ownerId.
 * 
 * @param user - Usuario actual (puede ser null)
 * @param isAdmin - Si el usuario es administrador
 * @param business - Objeto del negocio con ownerId y ownerEmail
 * @returns {boolean} True si el usuario puede editar el negocio
 */
export function canEditBusiness(
  user: User | null,
  isAdmin: boolean,
  business: { ownerId?: string; ownerEmail?: string | null } | null
): boolean {
  if (!user || !business) return false;
  if (isAdmin) return true;
  return Boolean(business.ownerId && user.uid === business.ownerId);
}
