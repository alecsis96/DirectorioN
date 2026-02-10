'use client';
/**
 * Panel de Admin para gestionar solicitudes de negocios
 * Sistema de estados dual: businessStatus + applicationStatus
 */
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import AdminQuickNav from './AdminQuickNav';
import { 
  getNewSubmissions, 
  getPendingBusinesses, 
  getReadyForReview,
  getPublishedBusinesses,
  getRejectedBusinesses,
  getAllBusinesses,
  approveBusiness,
  rejectBusiness,
  requestMoreInfo 
} from '../app/actions/adminBusinessActions';
import type { Business } from '../types/business';

type TabType = 'nuevas' | 'pendientes' | 'listas' | 'publicados' | 'rechazados' | 'todos';

type BusinessWithCompletion = Business & {
  completionPercent?: number;
  isPublishReady?: boolean;
  missingFields?: string[];
  businessStatus?: 'draft' | 'in_review' | 'published';
  applicationStatus?: 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
};

export default function AdminBusinessPanel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('nuevas');
  const [businesses, setBusinesses] = useState<BusinessWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Estados para modal de rechazo/solicitud de info
  const [modalState, setModalState] = useState<{
    type: 'reject' | 'info' | null;
    businessId: string | null;
    businessName: string;
  }>({
    type: null,
    businessId: null,
    businessName: '',
  });
  const [modalInput, setModalInput] = useState('');

  // Cargar datos según tab activo
  const loadBusinesses = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      let data: BusinessWithCompletion[] = [];
      
      switch (activeTab) {
        case 'nuevas':
          data = await getNewSubmissions();
          break;
        case 'pendientes':
          data = await getPendingBusinesses();
          break;
        case 'listas':
          data = await getReadyForReview();
          break;
        case 'publicados':
          data = await getPublishedBusinesses();
          break;
        case 'rechazados':
          data = await getRejectedBusinesses();
          break;
        case 'todos':
          data = await getAllBusinesses();
          break;
      }
      
      setBusinesses(data);
    } catch (error) {
      console.error('Error al cargar negocios:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }
    
    if (isAdmin) {
      loadBusinesses();
    }
  }, [authLoading, isAdmin, router, loadBusinesses]);

  // Handlers de acciones
  const handleApprove = async (businessId: string, businessName: string) => {
    if (!confirm(`¿Aprobar y publicar "${businessName}"?`)) return;
    
    setActionLoading(businessId);
    try {
      await approveBusiness(businessId);
      alert(`✅ ${businessName} ha sido aprobado y publicado`);
      await loadBusinesses();
    } catch (error) {
      console.error('Error al aprobar:', error);
      alert('Error al aprobar el negocio');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!modalState.businessId || !modalInput.trim()) {
      alert('Por favor, escribe el motivo del rechazo');
      return;
    }
    
    if (modalInput.trim().length < 10) {
      alert('El motivo del rechazo debe tener al menos 10 caracteres');
      return;
    }
    
    setActionLoading(modalState.businessId);
    try {
      await rejectBusiness(modalState.businessId, modalInput.trim());
      alert(`❌ ${modalState.businessName} ha sido rechazado`);
      setModalState({ type: null, businessId: null, businessName: '' });
      setModalInput('');
      await loadBusinesses();
    } catch (error) {
      console.error('error al rechazar negocio', error);
      alert(error instanceof Error ? error.message : 'Error al rechazar el negocio');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestInfo = async () => {
    if (!modalState.businessId || !modalInput.trim()) {
      alert('Por favor, escribe las notas para el usuario');
      return;
    }
    
    setActionLoading(modalState.businessId);
    try {
      await requestMoreInfo(modalState.businessId, modalInput.trim());
      alert(`📝 Se solicitó más información a ${modalState.businessName}`);
      setModalState({ type: null, businessId: null, businessName: '' });
      setModalInput('');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al solicitar info:', error);
      alert('Error al solicitar información');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Acceso denegado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
              <p className="text-sm sm:text-base text-gray-600">Gestiona las solicitudes y publicaciones de negocios</p>
            </div>
            
            {/* Navegación rápida */}
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/admin/applications" 
                className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                📋 Aplicaciones
              </Link>
              <Link 
                href="/admin/businesses" 
                className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                🏪 Negocios
              </Link>
              <Link 
                href="/admin/reviews" 
                className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ⭐ Reseñas
              </Link>
              <Link 
                href="/admin/stats" 
                className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                📊 Estadísticas
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-thin scrollbar-thumb-gray-300">
            <button
              onClick={() => setActiveTab('nuevas')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'nuevas'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📥 Nuevas Solicitudes</span>
                {businesses.length > 0 && activeTab === 'nuevas' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'pendientes'
                  ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>⏳ Pendientes</span>
                {businesses.length > 0 && activeTab === 'pendientes' && (
                  <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('listas')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'listas'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>✅ Listas para Publicar</span>
                {businesses.length > 0 && activeTab === 'listas' && (
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('publicados')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'publicados'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🏪 Publicados</span>
                {businesses.length > 0 && activeTab === 'publicados' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('rechazados')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'rechazados'
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>❌ Rechazados</span>
                {businesses.length > 0 && activeTab === 'rechazados' && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'todos'
                  ? 'bg-gray-50 text-gray-700 border-b-2 border-gray-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>📊 Todos</span>
                {businesses.length > 0 && activeTab === 'todos' && (
                  <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full">
                    {businesses.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Cargando negocios...</div>
            </div>
          ) : businesses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
              <div className="text-gray-400 text-4xl sm:text-5xl mb-4">📭</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                {activeTab === 'nuevas' && 'No hay nuevas solicitudes'}
                {activeTab === 'pendientes' && 'No hay solicitudes pendientes'}
                {activeTab === 'listas' && 'No hay negocios listos para publicar'}
                {activeTab === 'publicados' && 'No hay negocios publicados aún'}
                {activeTab === 'rechazados' && 'No hay negocios rechazados'}
                {activeTab === 'todos' && 'No hay negocios en el sistema'}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">
                Cuando haya solicitudes, aparecerán aquí
              </p>
              
              {/* Mensaje de ayuda si no hay datos en "todos" */}
              {activeTab === 'todos' && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-2xl mx-auto">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 ¿No ves negocios existentes?</h4>
                  <p className="text-xs sm:text-sm text-blue-800 mb-3">
                    Si tienes negocios en el sistema antiguo, necesitas ejecutar la migración:
                  </p>
                  <code className="block bg-blue-900 text-blue-100 px-3 py-2 rounded text-xs overflow-x-auto">
                    npm run migrate:business-states
                  </code>
                  <p className="text-xs text-blue-700 mt-2">
                    Esto actualizará tus negocios existentes al nuevo sistema de estados.
                  </p>
                </div>
              )}
              
              {/* Mensaje para otras pestañas */}
              {activeTab !== 'todos' && activeTab !== 'nuevas' && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-2xl mx-auto">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Nota:</strong> Los negocios aparecen aquí según su estado de completitud y aprobación. 
                    {activeTab === 'listas' && ' Un negocio necesita estar completo al 50%+ para aparecer como "Listo para publicar".'}
                    {activeTab === 'publicados' && ' Solo aparecen negocios que han sido aprobados por admin.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onApprove={handleApprove}
                  onReject={(id, name) => {
                    setModalState({ type: 'reject', businessId: id, businessName: name });
                    setModalInput('');
                  }}
                  onRequestInfo={(id, name) => {
                    setModalState({ type: 'info', businessId: id, businessName: name });
                    setModalInput('');
                  }}
                  isLoading={actionLoading === business.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Rechazo / Solicitud de Info */}
      {modalState.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {modalState.type === 'reject' ? '❌ Rechazar Negocio' : '📝 Solicitar Más Información'}
            </h3>
            <p className="text-gray-600 mb-4">
              {modalState.businessName}
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {modalState.type === 'reject' ? 'Motivo del rechazo:' : 'Notas para el usuario:'}
              {modalState.type === 'reject' && (
                <span className="text-xs text-gray-500 ml-2">
                  (mínimo 10 caracteres)
                </span>
              )}
            </label>
            <textarea
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder={
                modalState.type === 'reject'
                  ? 'Ej: La información de contacto no es válida'
                  : 'Ej: Por favor agrega imágenes de mejor calidad'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            {modalState.type === 'reject' && (
              <p className={`text-xs mt-1 ${
                modalInput.trim().length >= 10
                  ? 'text-green-600'
                  : modalInput.trim().length > 0
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }`}>
                {modalInput.trim().length}/10 caracteres mínimos
              </p>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalState({ type: null, businessId: null, businessName: '' });
                  setModalInput('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={modalState.type === 'reject' ? handleReject : handleRequestInfo}
                disabled={
                  !modalInput.trim() ||
                  (modalState.type === 'reject' && modalInput.trim().length < 10) ||
                  actionLoading === modalState.businessId
                }
                className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                  modalState.type === 'reject'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionLoading === modalState.businessId ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Navegación flotante móvil */}
      <AdminQuickNav />
    </div>
  );
}

// Componente de tarjeta de negocio
function BusinessCard({
  business,
  onApprove,
  onReject,
  onRequestInfo,
  isLoading,
}: {
  business: BusinessWithCompletion;
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  onRequestInfo: (id: string, name: string) => void;
  isLoading: boolean;
}) {
  const completion = business.completionPercent || 0;
  const isReady = business.isPublishReady || false;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Header con imagen/logo */}
      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600">
        {business.coverUrl || business.logoUrl ? (
          <img
            src={(business.coverUrl || business.logoUrl) || ''}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
            {business.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        
        {/* Badge de completitud */}
        <div className="absolute top-2 right-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            completion >= 75 ? 'bg-green-500' :
            completion >= 50 ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white shadow-lg`}>
            {completion}%
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1 truncate">{business.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{business.category || 'Sin categoría'}</p>
        
        {/* Estados */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            business.businessStatus === 'published' ? 'bg-green-100 text-green-700' :
            business.businessStatus === 'in_review' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {business.businessStatus || 'draft'}
          </span>
          
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            business.applicationStatus === 'approved' ? 'bg-green-100 text-green-700' :
            business.applicationStatus === 'ready_for_review' ? 'bg-blue-100 text-blue-700' :
            business.applicationStatus === 'needs_info' ? 'bg-orange-100 text-orange-700' :
            business.applicationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {business.applicationStatus || 'submitted'}
          </span>
        </div>

        {/* Campos faltantes */}
        {business.missingFields && business.missingFields.length > 0 && (
          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
            <p className="text-xs font-semibold text-orange-700 mb-1">Campos faltantes:</p>
            <div className="flex flex-wrap gap-1">
              {business.missingFields.slice(0, 3).map((field) => (
                <span key={field} className="text-xs bg-white px-2 py-0.5 rounded text-orange-600">
                  {field}
                </span>
              ))}
              {business.missingFields.length > 3 && (
                <span className="text-xs text-orange-600">
                  +{business.missingFields.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="text-xs text-gray-500 mb-3 space-y-1">
          <div className="flex items-center gap-1">
            <span>📧</span>
            <span className="truncate">{business.ownerEmail || 'Sin email'}</span>
          </div>
          {business.phone && (
            <div className="flex items-center gap-1">
              <span>📞</span>
              <span>{business.phone}</span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.open(`/dashboard/${business.id}`, '_blank')}
            className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            👁️ Ver Dashboard
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(business.id!, business.name!)}
              disabled={isLoading || !isReady}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isReady ? 'El negocio no cumple los requisitos mínimos' : 'Aprobar y publicar'}
            >
              ✅ Aprobar
            </button>
            <button
              onClick={() => onReject(business.id!, business.name!)}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
            >
              ❌ Rechazar
            </button>
          </div>
          
          <button
            onClick={() => onRequestInfo(business.id!, business.name!)}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            📝 Solicitar Info
          </button>
        </div>
      </div>
    </div>
  );
}
