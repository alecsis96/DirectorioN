import React from 'react';
import Link from 'next/link';
import BusinessOnboardingForm from '../../components/BusinessOnboardingForm';

export default function BusinessRegisterPage() {
  const adminWhats = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800 px-6 py-10">
      <section className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-[#38761D] mb-3">Registra tu negocio</h1>
        <div className="bg-white rounded-xl border p-5 shadow">
          <p className="mb-3">
            Publicar tu negocio en el Directorio te da más visibilidad en Yajalón: aparecerás en el buscador, podrás recibir reseñas, compartir fácilmente por WhatsApp y tener tu propio perfil con galería de imágenes.
          </p>
          <ul className="list-disc ml-6 space-y-1 mb-4 text-sm">
            <li>Perfil completo con fotos, horarios, contacto y redes.</li>
            <li>Etiqueta de “Destacado” disponible con costo adicional.</li>
            <li>Tu negocio aparece primero para clientes cercanos.</li>
          </ul>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm mb-4">
            <b>Costo:</b> La publicación tiene un costo. Al enviar la solicitud, nos pondremos en contacto contigo por WhatsApp para confirmar los detalles y activar tu perfil.
          </div>
          {adminWhats && (
            <div className="text-sm text-gray-600 mb-2">
              WhatsApp del administrador: <a className="text-green-700 underline" href={`https://wa.me/${adminWhats}`} target="_blank">{adminWhats}</a>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border p-5 shadow">
          <h2 className="text-xl font-semibold mb-3">Solicitud de publicación</h2>
          <p className="text-sm text-gray-600 mb-4">Completa los datos y te contactaremos por WhatsApp para validar y activar tu perfil.</p>
          <BusinessOnboardingForm />
          <div className="text-xs text-gray-500 mt-3">Al enviar aceptas nuestros términos y el contacto por WhatsApp para completar el registro.</div>
          <div className="mt-4">
            <Link href="/" className="text-sm text-blue-600 underline">Volver al inicio</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

