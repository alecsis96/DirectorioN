import { useEffect } from 'react';

interface HistoryItem {
  businessId: string;
  businessName: string;
  category?: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  viewedAt: string;
}

export function useBusinessHistory(business: {
  id?: string;
  name?: string;
  businessName?: string;
  category?: string;
  address?: string;
  imageUrl?: string;
  coverImage?: string;
  logo?: string;
  rating?: number;
} | null) {
  useEffect(() => {
    if (!business || !business.id) return;

    try {
      const historyItem: HistoryItem = {
        businessId: business.id,
        businessName: business.name || business.businessName || 'Sin nombre',
        category: business.category,
        address: business.address,
        imageUrl: business.coverImage || business.logo || business.imageUrl,
        rating: business.rating,
        viewedAt: new Date().toISOString(),
      };

      // Obtener historial existente
      const stored = localStorage.getItem('businessHistory');
      let history: HistoryItem[] = stored ? JSON.parse(stored) : [];

      // Remover duplicados del mismo negocio
      history = history.filter(item => item.businessId !== business.id);

      // Agregar al inicio
      history.unshift(historyItem);

      // Limitar a 50 items
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      // Guardar
      localStorage.setItem('businessHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving business history:', error);
    }
  }, [business]);
}
