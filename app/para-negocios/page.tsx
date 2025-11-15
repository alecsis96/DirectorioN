import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Para negocios | Directorio',
  description: 'Publica tu negocio en el directorio y llega a más clientes locales.',
};

const BENEFITS = [
  {
    title: 'Más visibilidad',
    copy: 'Tu negocio aparece en búsquedas locales y se comparte fácilmente por redes y WhatsApp.',
  },
  {
    title: 'Confianza',
    copy: 'Recibe reseñas de clientes reales y muestra fotos actualizadas de tus productos o servicios.',
  },
  {
    title: 'Soporte humano',
    copy: 'Te acompañamos durante el alta y resolvemos dudas por WhatsApp en horario extendido.',
  },
];

const PLANS = [
  {
    title: 'Gratis',
    price: '$0 / mes',
    features: ['Ficha básica', 'Reseñas y fotos', 'Soporte por correo'],
  },
  {
    title: 'Pro',
    price: '$199 / mes',
    features: ['Prioridad en búsquedas', 'Promociones destacadas', 'Soporte por WhatsApp'],
  },
  {
    title: 'Destacado',
    price: '$349 / mes',
    features: ['Banner en home', 'Campañas de difusión', 'Asesoría personalizada'],
  },
];

export default function ParaNegociosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-[#38761D] md:text-5xl">Haz crecer tu negocio en Yajalón</h1>
        <p className="mt-4 text-base text-gray-600 md:text-lg">
          Aparece en el directorio, recibe reseñas y comparte tus promociones con clientes cercanos.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/registro-negocio"
            className="rounded-full bg-[#38761D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2f5a1a]"
          >
            Comenzar registro
          </Link>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold text-[#38761D] text-center">Beneficios para tu negocio</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {BENEFITS.map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-left shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-semibold text-[#38761D] text-center">Planes disponibles</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Elige el plan que se ajusta a la etapa de tu negocio.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.title} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{plan.title}</h3>
                  <p className="text-sm text-gray-500">{plan.price}</p>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#38761D]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/registro-negocio"
                  className="mt-auto inline-flex justify-center rounded-lg border border-[#38761D] px-4 py-2 text-sm font-semibold text-[#38761D] hover:bg-[#38761D]/10"
                >
                  Comenzar registro
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
