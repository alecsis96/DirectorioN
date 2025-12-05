'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../firebaseConfig';
import { BsBuilding, BsPerson, BsPhone, BsGeoAlt, BsTag } from 'react-icons/bs';

export default function AdminBusinessCreator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Propietario
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    
    // Negocio
    name: '',
    businessName: '',
    category: '',
    description: '',
    
    // Ubicación
    address: '',
    colonia: '',
    municipio: 'Culiacán',
    
    // Contacto
    phone: '',
    whatsapp: '',
    
    // Plan
    plan: 'free' as 'free' | 'featured' | 'sponsor',
    status: 'published'
  });

  const categories = [
    'Restaurante',
    'Cafetería',
    'Panadería',
    'Comida Rápida',
    'Servicios',
    'Comercio',
    'Tecnología',
    'Salud y Belleza',
    'Educación',
    'Entretenimiento',
    'Deportes',
    'Automotriz',
    'Construcción',
    'Profesional',
    'Otro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.ownerEmail || !formData.category) {
      alert('Por favor completa los campos obligatorios: Nombre del negocio, Email del propietario y Categoría');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('❌ Debes iniciar sesión como administrador');
      return;
    }

    setLoading(true);

    try {
      const token = await user.getIdToken();
      
      const businessData = {
        ...formData,
        businessName: formData.name, // Aseguramos ambos campos
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        adminCreator: user.email,
        featured: formData.plan === 'featured',
        published: true,
        viewCount: 0,
        reviewCount: 0,
        avgRating: 0,
        isActive: true
      };

      const res = await fetch('/api/admin/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(businessData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el negocio');
      }

      alert('✅ Negocio creado exitosamente');
      router.push('/admin/businesses');
    } catch (error: any) {
      console.error('Error creating business:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Propietario */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <BsPerson className="text-xl text-[#38761D]" />
            <h2 className="text-lg font-bold text-gray-900">Información del Propietario</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Propietario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Juan Pérez"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email del Propietario <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="propietario@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono del Propietario
              </label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="6671234567"
              />
            </div>
          </div>
        </div>

        {/* Información del Negocio */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <BsBuilding className="text-xl text-[#38761D]" />
            <h2 className="text-lg font-bold text-gray-900">Información del Negocio</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Negocio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Mi Negocio"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
              >
                <option value="free">🆓 Gratuito</option>
                <option value="featured">⭐ Destacado</option>
                <option value="sponsor">👑 Patrocinado</option>
              </select>
              {(formData.plan === 'featured' || formData.plan === 'sponsor') && (
                <p className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ℹ️ Se establecerá automáticamente el próximo pago en 30 días
                </p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Breve descripción del negocio..."
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <BsGeoAlt className="text-xl text-[#38761D]" />
            <h2 className="text-lg font-bold text-gray-900">Ubicación</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Calle y número"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Colonia
              </label>
              <input
                type="text"
                value={formData.colonia}
                onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Nombre de la colonia"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Municipio
              </label>
              <input
                type="text"
                value={formData.municipio}
                onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="Yajalón"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 mb-4">
            <BsPhone className="text-xl text-[#38761D]" />
            <h2 className="text-lg font-bold text-gray-900">Contacto</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono del Negocio
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="6671234567"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                placeholder="5216671234567"
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#38761D] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#2d5a16] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : '✅ Crear Negocio'}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
