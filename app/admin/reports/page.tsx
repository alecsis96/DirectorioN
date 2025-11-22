'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebaseConfig';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import Link from 'next/link';
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
          'Authorization': `Bearer ${token}`,
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update report');

      // Recargar reportes
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

  const filteredReports = reports.filter(
    (report) => filter === 'all' || report.status === filter
  );

  const statusCounts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewing: reports.filter((r) => r.status === 'reviewing').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🚨 Reportes de Negocios</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mt-1">
                Panel de control
              </p>
            </div>
            <Link
              href="/admin/businesses"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todos' : REPORT_STATUS_LABELS[status]} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No hay reportes</p>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No se han recibido reportes aún.'
                : `No hay reportes con estado "${REPORT_STATUS_LABELS[filter as ReportStatus]}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {report.businessName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          report.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'reviewing'
                            ? 'bg-blue-100 text-blue-800'
                            : report.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Motivo:</strong> {REPORT_REASON_LABELS[report.reason]}
                    </p>
                    <p className="text-sm text-gray-800 mb-2">
                      <strong>Descripción:</strong> {report.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      Reportado el {new Date(report.createdAt).toLocaleString()}
                      {report.reporterEmail && ` por ${report.reporterEmail}`}
                    </p>
                    {report.reviewNotes && (
                      <p className="text-sm text-gray-700 mt-2 p-3 bg-blue-50 rounded">
                        <strong>Notas de revisión:</strong> {report.reviewNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/negocios/${report.businessId}`}
                    target="_blank"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    👁️ Ver Negocio
                  </Link>
                  <Link
                    href={`/dashboard/${report.businessId}`}
                    target="_blank"
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                  >
                    ⚙️ Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setReviewNotes(report.reviewNotes || '');
                    }}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
                  >
                    ✏️ Revisar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Revisar Reporte</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedReport.businessName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Motivo:</strong> {REPORT_REASON_LABELS[selectedReport.reason]}
                </p>
                <p className="text-sm text-gray-800">
                  <strong>Descripción:</strong> {selectedReport.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas de revisión (opcional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Agrega notas sobre tu decisión..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  disabled={isProcessing}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id!, 'reviewing')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  🔍 Marcar en Revisión
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id!, 'resolved')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  ✅ Resolver
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id!, 'dismissed')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50"
                >
                  ❌ Descartar
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setReviewNotes('');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
