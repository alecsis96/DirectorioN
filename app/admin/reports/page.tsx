'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { auth } from '../../../firebaseConfig';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type BusinessReport,
  type ReportStatus,
} from '../../../types/report';

export default function AdminReportsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<BusinessReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/');
        return;
      }

      const admin = await hasAdminOverride(user.email);
      if (!admin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      loadReports();
    });

    return () => unsubscribe();
  }, [router]);

  const loadReports = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/reports', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load reports');

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/reports/update', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update report');

      await loadReports();
      setSelectedReport(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Error al actualizar el reporte');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReports = useMemo(
    () => reports.filter((report) => filter === 'all' || report.status === filter),
    [filter, reports]
  );

  const statusCounts = {
    all: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    reviewing: reports.filter((report) => report.status === 'reviewing').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
    dismissed: reports.filter((report) => report.status === 'dismissed').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
          <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Reportes</h1>
          <p className="text-sm text-gray-600">Bandeja de moderacion para revisar incidencias y tomar una decision rapida.</p>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === status ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? 'Todos' : REPORT_STATUS_LABELS[status]} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </section>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-700">No hay reportes en esta vista.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{report.businessName}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          report.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'reviewing'
                              ? 'bg-blue-100 text-blue-800'
                              : report.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        {REPORT_REASON_LABELS[report.reason]}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{report.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{new Date(report.createdAt).toLocaleString('es-MX')}</span>
                      {report.reporterEmail ? <span>{report.reporterEmail}</span> : null}
                    </div>

                    {report.reviewNotes ? (
                      <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">{report.reviewNotes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/negocios/${report.businessId}`}
                      target="_blank"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Ver negocio
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setReviewNotes(report.reviewNotes || '');
                      }}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {selectedReport ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900">Revisar reporte</h3>
                <p className="mt-1 text-sm text-gray-600">{selectedReport.businessName}</p>
              </div>

              <div className="space-y-4 p-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Motivo:</strong> {REPORT_REASON_LABELS[selectedReport.reason]}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Descripcion:</strong> {selectedReport.description}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Notas de revision</span>
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Agrega una nota corta si hace falta."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    disabled={isProcessing}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedReport.id!, 'reviewing')}
                    disabled={isProcessing}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    En revision
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedReport.id!, 'resolved')}
                    disabled={isProcessing}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Resolver
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedReport.id!, 'dismissed')}
                    disabled={isProcessing}
                    className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    Descartar
                  </button>
                  <Link
                    href={`/dashboard/${selectedReport.businessId}`}
                    target="_blank"
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setReviewNotes('');
                    }}
                    disabled={isProcessing}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
