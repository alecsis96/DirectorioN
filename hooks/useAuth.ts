// hooks/useAuth.ts
// Hook reutilizable para gestión de autenticación y detección de admin

import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { hasAdminOverride } from "../lib/adminOverrides";
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const email =
            (tokenResult.claims?.email as string | undefined) || currentUser.email;
          setIsAdmin(
            tokenResult.claims?.admin === true || hasAdminOverride(email)
          );
          writeSessionCookie(tokenResult.token);
        } catch (error) {
          console.error("Error al verificar claims de admin:", error);
          setIsAdmin(false);
          writeSessionCookie();
        }
      } else {
        setIsAdmin(false);
        writeSessionCookie();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAdmin, loading };
}

/**
 * Hook simplificado que solo retorna el usuario actual
 * Útil cuando no necesitas verificar permisos de admin
 * 
 * @returns {User | null} Usuario autenticado o null
 */
/**
 * Verifica si el usuario actual puede editar un negocio específico
 * Considera tanto el ownerId como el ownerEmail para compatibilidad
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
  const normalizedUserEmail = (user.email || "").trim().toLowerCase();
  const normalizedOwnerEmail = (business.ownerEmail || "").trim().toLowerCase();
  const isOwnerById = Boolean(business.ownerId && user.uid === business.ownerId);
  const isOwnerByEmail = Boolean(normalizedUserEmail && normalizedOwnerEmail && normalizedUserEmail === normalizedOwnerEmail);
  return isOwnerById || isOwnerByEmail;
}
