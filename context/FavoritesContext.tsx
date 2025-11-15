'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type FavoritesContextValue = {
  favorites: string[];
  addFavorite: (businessId: string) => void;
  removeFavorite: (businessId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const STORAGE_KEY = 'favorites:businesses';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean);
        setFavorites(Array.from(new Set(sanitized)));
      }
    } catch (error) {
      console.warn('[FavoritesProvider] failed to read localStorage', error);
    } finally {
      hasLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('[FavoritesProvider] failed to persist localStorage', error);
    }
  }, [favorites]);

  const addFavorite = useCallback((businessId: string) => {
    setFavorites((prev) => {
      if (!businessId || prev.includes(businessId)) return prev;
      return [...prev, businessId];
    });
  }, []);

  const removeFavorite = useCallback((businessId: string) => {
    setFavorites((prev) => prev.filter((id) => id !== businessId));
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      addFavorite,
      removeFavorite,
    }),
    [favorites, addFavorite, removeFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}
