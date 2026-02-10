import type { Metadata } from 'next';
import Link from 'next/link';
import PricingHero from '@/components/PricingHero';

export const metadata: Metadata = {
  title: 'Alta Asistida - Directorio de Negocios Yajalón',
  description: 'Te ayudamos a registrar tu negocio. Envíanos los datos por WhatsApp y lo publicamos por ti.',
};

export default function AltaAsistidaPage() {
  // Número de WhatsApp del directorio (ajustar al número real)
  const whatsappNumber = '5219191565865';
  
  // Mensaje prellenado para WhatsApp
  const mensaje = encodeURIComponent(
    'Hola! Quiero registrar mi negocio en YajaGon con ayuda.\n\n' +
    'Datos de mi negocio:\n' +
    '• Nombre: \n' +
    '• Categoría: \n' +
    '• Dirección: \n' +
    '• WhatsApp: \n' +
    '• Horarios: \n' +
    '• (Adjuntaré 1-3 fotos)'
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensaje}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header con navegación */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Volver al inicio"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Alta Asistida</h1>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Hero section */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤝</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Te lo subimos nosotros
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Mándanos los datos por WhatsApp y lo publicamos en YajaGon. 
            Es rápido, fácil y sin complicaciones.
          </p>
        </div>

        {/* Card con información */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Datos que necesitamos
          </h3>
          
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p className="font-semibold text-gray-900">Nombre del negocio</p>
                <p className="text-sm text-gray-600">Como quieres que aparezca en el directorio</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p className="font-semibold text-gray-900">Categoría</p>
                <p className="text-sm text-gray-600">Ej: Restaurante, Cafetería, Tienda, Servicios, etc.</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <p className="font-semibold text-gray-900">Dirección completa</p>
                <p className="text-sm text-gray-600">Calle, número, colonia, Yajalón, Chiapas</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">4</span>
              <div>
                <p className="font-semibold text-gray-900">WhatsApp de contacto</p>
                <p className="text-sm text-gray-600">Para que tus clientes te puedan contactar</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">5</span>
              <div>
                <p className="font-semibold text-gray-900">Horarios de atención</p>
                <p className="text-sm text-gray-600">Días y horas en que atiendes</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">6</span>
              <div>
                <p className="font-semibold text-gray-900">Fotos (1-3 imágenes)</p>
                <p className="text-sm text-gray-600">De tu local, productos o servicios</p>
              </div>
            </li>
          </ul>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Sin costo adicional.</strong> Solo envíanos los datos y nosotros nos encargamos del registro.
              </span>
            </p>
          </div>
        </div>

        {/* Sección de Pricing Profesional */}
        <PricingHero 
          categoryId="general"
          showAltaAsistida={true}
          onSelectPlan={(plan) => {
            const planNames = {
              free: 'Básico (Gratis)',
              destacado: 'Destacado',
              patrocinado: 'Patrocinado'
            };
            const mensaje = encodeURIComponent(
              `Hola! Quiero contratar el plan ${planNames[plan]}.\n\n` +
              'Datos de mi negocio:\n' +
              '• Nombre: \n' +
              '• Categoría: \n' +
              '• Dirección: \n' +
              '• WhatsApp: '
            );
            window.open(`https://wa.me/5219191565865?text=${mensaje}`, '_blank');
          }}
        />

        {/* Separador */}
        <div className="my-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-500 text-sm font-medium">o envíanos solo los datos</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* CTA Button */}
        <div className="text-center space-y-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 w-full max-w-md px-8 py-4 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-7 h-7 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-white">Enviar por WhatsApp</span>
          </a>

          <p className="text-sm text-gray-500">
            O si prefieres, <Link href="/para-negocios" className="text-blue-600 hover:text-blue-700 underline font-medium">regístralo tú mismo</Link>
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Preguntas frecuentes</h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-900 mb-1">¿Cuánto tarda el registro?</p>
              <p className="text-sm text-gray-600">Normalmente procesamos las solicitudes en 24-48 horas hábiles.</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-900 mb-1">¿Tiene algún costo?</p>
              <p className="text-sm text-gray-600">El registro básico es gratuito. Si deseas un plan premium, te contactaremos con las opciones.</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-900 mb-1">¿Puedo editar después?</p>
              <p className="text-sm text-gray-600">Sí, una vez publicado te daremos acceso para que puedas actualizar tu información cuando quieras.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 px-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            ¿Tienes dudas? Escríbenos a WhatsApp y te ayudamos.
          </p>
          <div className="mt-4">
            <Link 
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
