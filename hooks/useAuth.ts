// hooks/useAuth.ts
// Hook reutilizable para gestión de autenticación y detección de admin

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

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
    // Suscripción al cambio de estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Obtener el token con claims personalizados
          const tokenResult = await currentUser.getIdTokenResult();
          setIsAdmin(tokenResult.claims?.admin === true);
        } catch (error) {
          console.error('Error al verificar claims de admin:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    // Cleanup: desuscribirse cuando el componente se desmonte
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
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return user;
}

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
  business: { ownerId?: string; ownerEmail?: string } | null
): boolean {
  if (!user || !business) return false;
  
  // Admin siempre puede editar
  if (isAdmin) return true;

  // Verificar por ownerId (método principal)
  if (business.ownerId && user.uid === business.ownerId) return true;

  // Verificar por ownerEmail (fallback para compatibilidad)
  if (business.ownerEmail && user.email) {
    return user.email.toLowerCase() === business.ownerEmail.toLowerCase();
  }

  return false;
}
