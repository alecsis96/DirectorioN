'use client';

import { useState, useMemo } from 'react';
import { getFirestore, doc, updateDoc, deleteDoc } from 'firebase/firestore';

type ReviewData = {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  name: string;
  text: string;
  rating: number;
  created: string; // ISO string
  updated?: string; // ISO string
  approved?: boolean;
};

type ReviewsModerationClientProps = {
  initialReviews: ReviewData[];
};

export default function ReviewsModerationClient({ initialReviews }: ReviewsModerationClientProps) {
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'business'>('date');
  const [loading, setLoading] = useState<string | null>(null);

  const db = getFirestore();

  // Filtrar y ordenar reseñas
  const filteredReviews = useMemo(() => {
    let filtered = reviews.filter((review) => {
      // Filtro por estado
      if (filterStatus === 'approved' && review.approved !== true) return false;
      if (filterStatus === 'pending' && review.approved !== false) return false;

      // Búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          review.businessName.toLowerCase().includes(term) ||
          review.name.toLowerCase().includes(term) ||
          review.text.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else if (sortBy === 'business') {
        return a.businessName.localeCompare(b.businessName);
      } else {
        // Por fecha (default)
        const dateA = new Date(a.created);
        const dateB = new Date(b.created);
        return dateB.getTime() - dateA.getTime();
      }
    });

    return filtered;
  }, [reviews, filterStatus, searchTerm, sortBy]);

  const handleApprove = async (review: ReviewData) => {
    setLoading(review.id);
    try {
      const reviewRef = doc(db, 'businesses', review.businessId, 'reviews', review.id);
      await updateDoc(reviewRef, { approved: true });
      
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, approved: true } : r))
      );
      alert('Reseña aprobada exitosamente');
    } catch (error) {
      console.error('Error aprobando reseña:', error);
      alert('Error al aprobar la reseña');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (review: ReviewData) => {
    setLoading(review.id);
    try {
      const reviewRef = doc(db, 'businesses', review.businessId, 'reviews', review.id);
      await updateDoc(reviewRef, { approved: false });
      
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, approved: false } : r))
      );
      alert('Reseña rechazada');
    } catch (error) {
      console.error('Error rechazando reseña:', error);
      alert('Error al rechazar la reseña');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (review: ReviewData) => {
    if (!confirm(`¿Estás seguro de eliminar esta reseña de ${review.name}?`)) return;
    
    setLoading(review.id);
    try {
      const reviewRef = doc(db, 'businesses', review.businessId, 'reviews', review.id);
      await deleteDoc(reviewRef);
      
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      alert('Reseña eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando reseña:', error);
      alert('Error al eliminar la reseña');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              id="search"
              type="text"
              placeholder="Buscar por negocio, autor o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por estado */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="approved">Aprobadas</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>

          {/* Ordenar por */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="date">Fecha</option>
              <option value="rating">Calificación</option>
              <option value="business">Negocio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de reseñas */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No se encontraron reseñas con los filtros seleccionados
          </div>
        ) : (
          filteredReviews.map((review) => {
            const createdDate = new Date(review.created);
            const isProcessing = loading === review.id;

            return (
              <div
                key={review.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  review.approved === false ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Negocio */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{review.businessName}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          review.approved !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {review.approved !== false ? 'Aprobada' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Autor y fecha */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold uppercase">
                          {review.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium">{review.name}</span>
                      </div>
                      <span>•</span>
                      <span>{createdDate.toLocaleDateString('es-MX')}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <span key={i} className="text-yellow-500">★</span>
                        ))}
                        {Array.from({ length: 5 - review.rating }).map((_, i) => (
                          <span key={i} className="text-gray-300">★</span>
                        ))}
                      </div>
                    </div>

                    {/* Texto de la reseña */}
                    <p className="text-gray-700 whitespace-pre-line">{review.text}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  {review.approved !== true && (
                    <button
                      onClick={() => handleApprove(review)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isProcessing ? 'Procesando...' : '✓ Aprobar'}
                    </button>
                  )}
                  {review.approved !== false && (
                    <button
                      onClick={() => handleReject(review)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isProcessing ? 'Procesando...' : '⚠ Rechazar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isProcessing ? 'Procesando...' : '🗑 Eliminar'}
                  </button>
                  <a
                    href={`/negocios/${review.businessId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Ver negocio →
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
