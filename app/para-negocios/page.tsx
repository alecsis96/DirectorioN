import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '¿Tienes un negocio? Únete gratis al Directorio de Yajalón',
  description:
    'Más de 1,000 clientes potenciales buscan negocios como el tuyo cada mes. Regístrate gratis y empieza a recibir más clientes hoy mismo.',
};

const BENEFITS = [
  { icon: '🚀', title: 'Más clientes', copy: 'Aparece donde tus clientes buscan. +1,000 visitas mensuales de personas listas para comprar.', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50' },
  { icon: '⭐', title: 'Construye reputación', copy: 'Recibe reseñas auténticas y muestra fotos que convencen. El 90% de clientes lee reseñas antes de comprar.', color: 'from-yellow-500 to-orange-500', bgColor: 'bg-yellow-50' },
  { icon: '💬', title: 'Contacto directo', copy: 'Botones de WhatsApp, teléfono y ubicación. Tus clientes te contactan con un solo clic.', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50' },
  { icon: '⏱️', title: 'Registro en 5 minutos', copy: 'Completa el formulario, agrega fotos y empieza a recibir clientes el mismo día.', color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50' },
  { icon: '🆓', title: 'Gratis para empezar', copy: 'Sin costos ocultos, sin tarjeta de crédito. Prueba y mejora cuando quieras.', color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-50' },
  { icon: '📍', title: 'Clientes locales', copy: 'Personas de Yajalón buscando exactamente lo que ofreces. Tráfico de calidad, no cantidad.', color: 'from-red-500 to-rose-500', bgColor: 'bg-red-50' },
];

const STATS = [
  { number: '+150', label: 'Negocios registrados' },
  { number: '+1,000', label: 'Búsquedas mensuales' },
  { number: '+500', label: 'Reseñas publicadas' },
  { number: '4.8★', label: 'Calificación promedio' },
];

const PLANS = [
  {
    title: 'Plan Gratuito',
    subtitle: 'Perfecto para empezar',
    price: '$0',
    period: 'para siempre',
    features: [
      'Ficha completa con fotos',
      'Horarios de atención',
      'Ubicación en mapa',
      'Botones de contacto directo',
      'Reseñas ilimitadas',
      'Actualiza cuando quieras',
    ],
    cta: 'Comenzar Gratis',
    popular: false,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    title: 'Plan Destacado',
    subtitle: '¡El más popular!',
    price: '$199',
    period: 'al mes',
    features: [
      'Todo del plan gratuito',
      'Aparece primero en búsquedas',
      'Badge "Negocio Destacado"',
      'Estadísticas de visitas',
      'Galería de hasta 10 fotos',
      'Soporte prioritario por WhatsApp',
    ],
    cta: 'Elegir Destacado',
    popular: true,
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    title: 'Plan Premium',
    subtitle: 'Máxima visibilidad',
    price: '$349',
    period: 'al mes',
    features: [
      'Todo del plan destacado',
      'Banner en página principal',
      'Campañas en redes sociales',
      'Análisis mensual personalizado',
      'Promociones exclusivas',
      'Asesoría de marketing 1 a 1',
    ],
    cta: 'Ir a Premium',
    popular: false,
    gradient: 'from-purple-500 to-pink-600',
  },
];

const TESTIMONIALS = [
  {
    name: 'María González',
    business: 'Cafetería La Esquina',
    text: 'Desde que nos registramos, nuestras ventas aumentaron 40%. Los clientes nos encuentran más fácil y las reseñas nos ayudan mucho.',
    rating: 5,
  },
  {
    name: 'Carlos Méndez',
    business: 'Taller Mecánico El Rápido',
    text: 'Excelente servicio. El proceso de registro fue súper rápido y ahora recibo llamadas todos los días de clientes nuevos.',
    rating: 5,
  },
  {
    name: 'Ana Ruiz',
    business: 'Panadería Doña Rosa',
    text: 'Lo mejor es el botón de WhatsApp. Los clientes me escriben directamente para hacer pedidos. ¡Súper recomendado!',
    rating: 5,
  },
];

export default function ParaNegociosPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700 px-6 py-20 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative h-24 w-24 md:h-32 md:w-32">
                <Image src="/images/logo.png" alt="Directorio Yajalón" fill className="object-contain drop-shadow-2xl" priority />
              </div>
            </div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <span className="text-yellow-300">⭐</span>
              <span>+150 negocios ya confían en nosotros</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              ¿Quieres más Clientes para<br />tu Negocio en Yajalón?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-emerald-50">
              Únete al directorio más visitado de la zona. <strong className="text-white">+1,000 personas</strong> buscan negocios como el tuyo cada mes.
              <span className="block mt-2 text-emerald-100">Regístrate gratis y empieza a recibir más clientes hoy.</span>
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/registro-negocio"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-emerald-600 shadow-2xl transition-all hover:scale-105 hover:shadow-emerald-500/50"
              >
                Registrar mi Negocio Gratis
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="#planes"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-bold backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Ver Planes y Precios
              </Link>
            </div>
            <p className="mt-4 text-sm text-emerald-100">
              Sin tarjeta de crédito · Activación inmediata · Cancela cuando quieras
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur-sm">
                <div className="text-3xl font-extrabold md:text-4xl">{stat.number}</div>
                <div className="mt-1 text-sm text-emerald-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
              ¿Por qué registrar tu negocio aquí?
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Más que un simple listado. Una herramienta completa para hacer crecer tu negocio.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 transition-opacity group-hover:opacity-5`} />
                <div className="relative">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${benefit.bgColor} text-3xl shadow-inner`}>
                    {benefit.icon}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-gray-900">{benefit.title}</h3>
                  <p className="mt-2 text-gray-600">{benefit.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
              Lo que dicen nuestros negocios
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Historias reales de éxito de negocios locales como el tuyo
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-1 text-yellow-400">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-xl">⭐</span>
                  ))}
                </div>
                <p className="mt-4 text-gray-700 italic">"{testimonial.text}"</p>
                <div className="mt-4 border-t pt-4">
                  <div className="font-bold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planes" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
              Elige el plan perfecto para tu negocio
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Empieza gratis y crece cuando estés listo. Sin compromisos.
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.title}
                className={`relative overflow-hidden rounded-3xl border-4 bg-white p-8 shadow-xl transition-all hover:scale-105 ${
                  plan.popular ? 'border-emerald-500 shadow-emerald-500/20' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-500 to-green-600 px-12 py-1 text-xs font-bold text-white shadow-lg">
                    MÁS POPULAR
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900">{plan.title}</h3>
                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-gray-700 text-base">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/registro-negocio"
                  className={`mt-8 block w-full rounded-xl bg-gradient-to-r ${plan.gradient} px-6 py-4 text-center text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-20 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,#ffffff,transparent_35%),radial-gradient(circle_at_80%_0%,#c7f9cc,transparent_25%)]" />
        <div className="relative mx-auto max-w-4xl text-center space-y-4">
          <h2 className="text-3xl font-extrabold md:text-5xl">¿Listo para Hacer Crecer tu Negocio?</h2>
          <p className="text-xl text-white font-semibold">
            Únete a los +150 negocios que ya están recibiendo más clientes cada día
          </p>
          <div className="mt-4">
            <Link
              href="/registro-negocio"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-5 text-xl font-bold text-emerald-600 shadow-2xl transition-all hover:scale-105"
            >
              Registrar mi Negocio Ahora
            </Link>
          </div>
          <p className="text-sm text-emerald-50">
            Proceso de registro en solo 5 minutos · 100% gratis para empezar
          </p>
        </div>
      </section>
    </main>
  );
}
