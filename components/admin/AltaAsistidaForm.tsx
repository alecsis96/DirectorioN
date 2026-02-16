'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { CATEGORY_GROUPS, CATEGORIES } from '@/lib/categoriesCatalog';
import { createAssistedBusiness } from '@/app/actions/adminBusinessActions';

type SourceChannel = 'whatsapp' | 'messenger' | 'visita' | 'telefono' | 'otro';
type PlanType = 'free' | 'featured' | 'sponsor';

export default function AltaAsistidaForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombreNegocio: '',
    telefonoWhatsApp: '',
    categoryGroupId: '',
    categoryId: '',
    colonia: '',
    sourceChannel: 'whatsapp' as SourceChannel,
    planInicial: 'free' as PlanType,
    internalNote: '',
  });

  // Filtered categories based on selected group
  const filteredCategories = formData.categoryGroupId
    ? CATEGORIES.filter((cat) => cat.groupId === formData.categoryGroupId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('No estás autenticado');
      return;
    }

    // Validación básica
    if (!formData.nombreNegocio || !formData.telefonoWhatsApp || !formData.categoryId) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      // Forzar refresh del token para obtener claims actualizados
      const token = await user.getIdToken(true);
      const result = await createAssistedBusiness(
        {
          name: formData.nombreNegocio,
          phone: formData.telefonoWhatsApp,
          WhatsApp: formData.telefonoWhatsApp,
          categoryId: formData.categoryId,
          colonia: formData.colonia || undefined,
          neighborhood: formData.colonia || undefined,
          sourceChannel: formData.sourceChannel,
          plan: formData.planInicial,
          internalNote: formData.internalNote || undefined,
        },
        token
      );

      if (result.success && result.businessId) {
        alert(`✅ Alta asistida creada: ${formData.nombreNegocio}`);
        router.push(`/dashboard/${result.businessId}`);
      } else {
        alert(`Error: ${result.error || 'No se pudo crear el negocio'}`);
      }
    } catch (error) {
      console.error('Error al crear alta asistida:', error);
      alert('Error al crear el negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
        
        {/* Nombre del negocio */}
        <div>
          <label htmlFor="nombreNegocio" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del negocio <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nombreNegocio"
            required
            value={formData.nombreNegocio}
            onChange={(e) => setFormData({ ...formData, nombreNegocio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Ej: Tacos El Güero"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label htmlFor="telefonoWhatsApp" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="telefonoWhatsApp"
            required
            value={formData.telefonoWhatsApp}
            onChange={(e) => setFormData({ ...formData, telefonoWhatsApp: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="9191234567"
          />
        </div>

        {/* Categoría - Dos selects: grupo y categoría específica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grupo */}
          <div>
            <label htmlFor="categoryGroup" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de negocio <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryGroup"
              required
              value={formData.categoryGroupId}
              onChange={(e) => {
                setFormData({ 
                  ...formData, 
                  categoryGroupId: e.target.value,
                  categoryId: '' // Reset category cuando cambia grupo
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Selecciona tipo</option>
              {CATEGORY_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.icon} {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría específica */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría específica <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              disabled={!formData.categoryGroupId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecciona categoría</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Colonia (opcional) */}
        <div>
          <label htmlFor="colonia" className="block text-sm font-medium text-gray-700 mb-1">
            Colonia / Ubicación <span className="text-gray-400">(Opcional)</span>
          </label>
          <input
            type="text"
            id="colonia"
            value={formData.colonia}
            onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Ej: Centro, Colonia Norte"
          />
        </div>
      </div>

      {/* Información operativa */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Información Operativa</h3>
        
        {/* Canal de origen */}
        <div>
          <label htmlFor="sourceChannel" className="block text-sm font-medium text-gray-700 mb-1">
            Canal de contacto <span className="text-red-500">*</span>
          </label>
          <select
            id="sourceChannel"
            required
            value={formData.sourceChannel}
            onChange={(e) => setFormData({ ...formData, sourceChannel: e.target.value as SourceChannel })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="messenger">🔵 Messenger</option>
            <option value="visita">🚶 Visita directa</option>
            <option value="telefono">📞 Teléfono</option>
            <option value="otro">📋 Otro</option>
          </select>
        </div>

        {/* Plan inicial */}
        <div>
          <label htmlFor="planInicial" className="block text-sm font-medium text-gray-700 mb-1">
            Plan inicial <span className="text-gray-400">(Opcional)</span>
          </label>
          <select
            id="planInicial"
            value={formData.planInicial}
            onChange={(e) => setFormData({ ...formData, planInicial: e.target.value as PlanType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="free">🆓 Free (Básico)</option>
            <option value="featured">⭐ Featured (Destacado)</option>
            <option value="sponsor">💎 Sponsor (Premium)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Solo preselección. No obliga portada ni validaciones adicionales.
          </p>
        </div>

        {/* Notas internas */}
        <div>
          <label htmlFor="internalNote" className="block text-sm font-medium text-gray-700 mb-1">
            Notas internas <span className="text-gray-400">(Opcional)</span>
          </label>
          <textarea
            id="internalNote"
            rows={3}
            value={formData.internalNote}
            onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Contexto del cliente, observaciones, etc."
          />
        </div>
      </div>

      {/* Información del proceso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">¿Qué sucede al crear?</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• El negocio se crea con estado <strong>draft</strong> / <strong>ready_for_review</strong></li>
              <li>• Aparecerá en la pestaña <strong>"Listas para publicar"</strong></li>
              <li>• Requiere aprobación final antes de publicarse</li>
              <li>• Serás redirigido al dashboard para completar información</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {loading ? 'Creando...' : '✓ Crear Alta Asistida'}
        </button>
      </div>
    </form>
  );
}
