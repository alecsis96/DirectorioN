'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Trash2, Eye, MapPin, Star, ArrowLeft, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

interface HistoryItem {
  businessId: string;
  businessName: string;
  category?: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  viewedAt: string;
}

export default function HistorialPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar historial desde localStorage
    try {
      const stored = localStorage.getItem('businessHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ordenar por fecha más reciente
        const sorted = parsed.sort((a: HistoryItem, b: HistoryItem) => 
          new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
        );
        setHistory(sorted);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = () => {
    if (confirm('¿Estás seguro de que quieres borrar todo tu historial?')) {
      localStorage.removeItem('businessHistory');
      setHistory([]);
    }
  };

  const removeItem = (businessId: string) => {
    const updated = history.filter(item => item.businessId !== businessId);
    setHistory(updated);
    localStorage.setItem('businessHistory', JSON.stringify(updated));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#38761D] hover:text-[#2d5418] mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#38761D] rounded-lg flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Historial de Navegación
              </h1>
              <p className="text-sm text-gray-600">
                {history.length} negocio{history.length !== 1 ? 's' : ''} visitado{history.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Borrar todo</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <Eye className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Sin historial aún
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Cuando visites negocios en el directorio, aparecerán aquí para que puedas volver a verlos fácilmente.
            </p>
            <Link
              href="/negocios"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5418] transition shadow-lg hover:shadow-xl"
            >
              <ShoppingBag className="w-5 h-5" />
              Explorar Negocios
            </Link>
          </div>
        ) : (
          /* History List */
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={`${item.businessId}-${item.viewedAt}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition group"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <Link href={`/negocios/${item.businessId}`} className="flex-shrink-0">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.businessName}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#38761D] to-[#2d5418]">
                          <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/negocios/${item.businessId}`}
                      className="block"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#38761D] transition truncate">
                        {item.businessName}
                      </h3>
                    </Link>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                      {item.category && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">•</span>
                          {item.category}
                        </span>
                      )}
                      {item.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </span>
                      )}
                      {item.rating && item.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Visitado {formatDate(item.viewedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/negocios/${item.businessId}`}
                      className="px-4 py-2 bg-[#38761D] text-white text-sm font-semibold rounded-lg hover:bg-[#2d5418] transition hidden sm:block"
                    >
                      Ver detalles
                    </Link>
                    <button
                      onClick={() => removeItem(item.businessId)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar del historial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        {history.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Tu historial se guarda localmente en tu navegador. Si borras los datos del navegador, perderás este historial.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
