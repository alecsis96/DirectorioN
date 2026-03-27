'use client';

import { useMemo, useState } from 'react';

import { auth } from '../firebaseConfig';

type ReviewData = {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  name: string;
  text: string;
  rating: number;
  created: string;
  updated?: string;
  approved?: boolean;
};

type ReviewsModerationClientProps = {
  initialReviews: ReviewData[];
};

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReviewsModerationClient({ initialReviews }: ReviewsModerationClientProps) {
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'business'>('date');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredReviews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return [...reviews]
      .filter((review) => {
        if (filterStatus === 'approved' && review.approved !== true) return false;
        if (filterStatus === 'pending' && review.approved !== false) return false;

        if (!term) return true;

        return (
          review.businessName.toLowerCase().includes(term) ||
          review.name.toLowerCase().includes(term) ||
          review.text.toLowerCase().includes(term)
        );
      })
      .sort((left, right) => {
        if (sortBy === 'rating') return right.rating - left.rating;
        if (sortBy === 'business') return left.businessName.localeCompare(right.businessName);
        return new Date(right.created).getTime() - new Date(left.created).getTime();
      });
  }, [filterStatus, reviews, searchTerm, sortBy]);

  const handleApprove = async (review: ReviewData) => {
    setLoading(review.id);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Debes iniciar sesion');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/reviews/${review.businessId}/${review.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al aprobar');
      }

      setReviews((current) => current.map((item) => (item.id === review.id ? { ...item, approved: true } : item)));
    } catch (error) {
      console.error('Error aprobando resena:', error);
      alert(error instanceof Error ? error.message : 'Error al aprobar la resena');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (review: ReviewData) => {
    setLoading(review.id);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Debes iniciar sesion');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/reviews/${review.businessId}/${review.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: false }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al rechazar');
      }

      setReviews((current) => current.map((item) => (item.id === review.id ? { ...item, approved: false } : item)));
    } catch (error) {
      console.error('Error rechazando resena:', error);
      alert(error instanceof Error ? error.message : 'Error al rechazar la resena');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (review: ReviewData) => {
    if (!confirm(`Eliminar la resena de ${review.name}?`)) return;

    setLoading(review.id);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Debes iniciar sesion');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/reviews/${review.businessId}/${review.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setReviews((current) => current.filter((item) => item.id !== review.id));
    } catch (error) {
      console.error('Error eliminando resena:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar la resena');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <input
            type="text"
            placeholder="Buscar por negocio, autor o texto"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as 'all' | 'approved' | 'pending')}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Todas</option>
            <option value="approved">Aprobadas</option>
            <option value="pending">Pendientes</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'date' | 'rating' | 'business')}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="date">Mas recientes</option>
            <option value="rating">Calificacion</option>
            <option value="business">Negocio</option>
          </select>
        </div>
      </section>

      {filteredReviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          No se encontraron resenas con estos filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const isProcessing = loading === review.id;
            const isApproved = review.approved !== false;

            return (
              <article key={review.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{review.businessName}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {isApproved ? 'Aprobada' : 'Pendiente'}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {review.rating}/5
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{review.name}</span>
                      <span>{formatReviewDate(review.created)}</span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm text-gray-700">{review.text}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isApproved ? (
                      <button
                        onClick={() => handleApprove(review)}
                        disabled={isProcessing}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleReject(review)}
                      disabled={isProcessing}
                      className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100 disabled:opacity-50"
                    >
                      Rechazar
                    </button>

                    <button
                      onClick={() => handleDelete(review)}
                      disabled={isProcessing}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Eliminar
                    </button>

                    <a
                      href={`/negocios/${review.businessId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Ver negocio
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
