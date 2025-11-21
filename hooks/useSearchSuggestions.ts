'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface SearchSuggestion {
  type: 'business' | 'category' | 'suggestion' | 'recent' | 'popular';
  name: string;
  category?: string;
  id?: string;
}

const POPULAR_SEARCHES_KEY = 'popular_searches';
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT = 5;

export function useSearchSuggestions(searchTerm: string, categories: string[]) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      const term = searchTerm.toLowerCase().trim();
      const results: SearchSuggestion[] = [];

      try {
        // 1. Buscar negocios que coincidan
        const businessesRef = collection(db, 'businesses');
        const businessQuery = query(
          businessesRef,
          where('status', '==', 'approved'),
          limit(3)
        );

        const businessSnapshot = await getDocs(businessQuery);
        const matchingBusinesses = businessSnapshot.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().businessName || doc.data().name || '',
            category: doc.data().category || '',
          }))
          .filter(b => b.name.toLowerCase().includes(term))
          .slice(0, 3)
          .map(b => ({
            type: 'business' as const,
            name: b.name,
            category: b.category,
            id: b.id,
          }));

        results.push(...matchingBusinesses);

        // 2. Categorías que coincidan
        const matchingCategories = categories
          .filter(cat => cat.toLowerCase().includes(term))
          .slice(0, 2)
          .map(cat => ({ 
            type: 'category' as const, 
            name: cat 
          }));

        results.push(...matchingCategories);

        // 3. Sugerencias comunes
        const commonSuggestions = [
          'restaurantes', 'comida', 'pizza', 'tacos', 'hamburguesas',
          'café', 'panadería', 'postres', 'mariscos', 'antojitos',
          'ferretería', 'construcción', 'pintura', 'herramientas',
          'farmacia', 'medicina', 'doctor', 'dentista', 'laboratorio',
          'ropa', 'zapatos', 'boutique', 'accesorios', 'joyería',
          'electrónica', 'celulares', 'computadoras', 'reparación',
          'carnicería', 'verduras', 'frutas', 'abarrotes', 'supermercado',
          'papelería', 'librería', 'imprenta', 'copias',
          'belleza', 'salón', 'spa', 'uñas', 'barbería',
          'gimnasio', 'deportes', 'fitness',
          'mecánico', 'taller', 'llantas', 'refacciones',
          'muebles', 'decoración', 'hogar',
          'óptica', 'lentes',
          'veterinaria', 'mascotas',
          'floristería', 'flores',
          'fotografía', 'estudio',
        ].filter(s => 
          s.includes(term) && 
          !results.some(r => r.name.toLowerCase() === s) &&
          !matchingBusinesses.some(b => b.name.toLowerCase().includes(s))
        ).slice(0, 3)
        .map(s => ({ 
          type: 'suggestion' as const, 
          name: s 
        }));

        results.push(...commonSuggestions);

      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }

      setIsLoading(false);
      setSuggestions(results.slice(0, 8));
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, categories]);

  return { suggestions, isLoading };
}

// Historial de búsquedas recientes
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, []);

  const addRecentSearch = (search: string) => {
    if (!search.trim()) return;

    const updated = [
      search,
      ...recentSearches.filter(s => s.toLowerCase() !== search.toLowerCase())
    ].slice(0, MAX_RECENT);

    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

// Búsquedas populares
export function usePopularSearches() {
  const [popularSearches, setPopularSearches] = useState<Array<{ term: string; count: number }>>([]);

  useEffect(() => {
    const stored = localStorage.getItem(POPULAR_SEARCHES_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPopularSearches(
          Object.entries(data)
            .map(([term, count]) => ({ term, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );
      } catch (e) {
        console.error('Error parsing popular searches:', e);
      }
    }
  }, []);

  const incrementSearch = (search: string) => {
    if (!search.trim()) return;

    const stored = localStorage.getItem(POPULAR_SEARCHES_KEY);
    let data: Record<string, number> = {};

    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing popular searches:', e);
      }
    }

    data[search] = (data[search] || 0) + 1;
    localStorage.setItem(POPULAR_SEARCHES_KEY, JSON.stringify(data));

    // Actualizar estado
    const updated = Object.entries(data)
      .map(([term, count]) => ({ term, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setPopularSearches(updated);
  };

  return { popularSearches, incrementSearch };
}
