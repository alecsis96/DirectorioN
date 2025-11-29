import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

type Plan = {
  title: string;
  subtitle: string;
  price: string;
  period: string;
  perks: string[];
  cta: string;
  badge: string | null;
  gradient: string;
  popular?: boolean;
};

const BENEFITS = [
  { icon: '+', title: 'Mas clientes', copy: 'Visibilidad inmediata ante personas de Yajalon que buscan lo que vendes.' },
  { icon: '*', title: 'Reputacion real', copy: 'Resenas verificadas y fotos que generan confianza desde el primer clic.' },
  { icon: '#', title: 'Contacto directo', copy: 'Botones de WhatsApp, llamada y mapa para que te contacten sin friccion.' },
  { icon: '>', title: 'Registro express', copy: 'Completa tu ficha en minutos, publica y actualiza cuando quieras.' },
  { icon: '!', title: 'Gratis para empezar', copy: 'Sin tarjeta ni letras chiquitas. Escala cuando necesites mas visibilidad.' },
  { icon: '@', title: 'Alcance local', copy: 'Tu negocio aparece a quienes estan cerca y listos para comprar.' },
];

const PLANS: Plan[] = [
  {
    title: 'Plan Gratuito',
    subtitle: 'Perfecto para empezar',
    price: '$0',
    period: 'para siempre',
    perks: ['Ficha completa con fotos', 'Horarios y ubicacion en mapa', 'Botones de contacto directo', 'Resenas ilimitadas', 'Actualiza cuando quieras'],
    cta: 'Comenzar Gratis',
    badge: null,
    gradient: 'from-gray-600 to-gray-700',
  },
  {
    title: 'Plan Destacado',
    subtitle: 'El mas popular',
    price: '$199',
    period: 'al mes',
    perks: [
      'Todo del plan gratuito',
      'Prioridad en busquedas',
      'Badge "Negocio Destacado"',
      'Estadisticas de visitas',
      'Galeria de hasta 10 fotos',
      'Soporte prioritario por WhatsApp',
    ],
    cta: 'Elegir Destacado',
    badge: 'MAS POPULAR',
    gradient: 'from-emerald-500 to-green-600',
    popular: true,
  },
  {
    title: 'Plan Premium',
    subtitle: 'Maxima visibilidad',
    price: '$349',
    period: 'al mes',
    perks: [
      'Todo del plan destacado',
      'Banner en pagina principal',
      'Campanas en redes sociales',
      'Analisis mensual personalizado',
      'Promociones exclusivas',
      'Asesoria de marketing 1 a 1',
    ],
    cta: 'Ir a Premium',
    badge: null,
    gradient: 'from-purple-500 to-pink-600',
  },
];

export const metadata: Metadata = {
  title: 'Unete al Directorio de Yajalon | Planes para tu negocio',
  description: 'Registra tu negocio en minutos, gratis. Escala a planes con mayor visibilidad cuando quieras.',
};

export default function ParaNegociosPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-gray-800">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 px-6 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(199,249,204,0.25),transparent_25%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 text-center md:flex-row md:items-center md:text-left">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <span className="text-yellow-200">*</span> +150 negocios ya confian en nosotros
            </div>
            <h1 className="text-4xl font-extrabold leading-tight drop-shadow-sm md:text-5xl">Listo para llegar a mas clientes en Yajalon?</h1>
            <p className="text-lg text-emerald-50 md:text-xl">
              Publica tu negocio gratis, recibe contactos por WhatsApp y aparece primero con nuestros planes destacados.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
              <Link
                href="/registro-negocio"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-lg font-bold text-emerald-700 shadow-2xl transition-all hover:scale-105 hover:shadow-emerald-500/40"
              >
                Registrar mi negocio gratis
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="#planes"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 text-lg font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Ver planes y precios
              </Link>
            </div>
            <p className="text-sm text-emerald-100">Sin tarjeta - Activacion inmediata - Cancela cuando quieras</p>
          </div>
          <div className="relative h-48 w-48 md:h-64 md:w-64">
            <div className="absolute inset-0 rounded-full bg-white/10 blur-3xl" />
            <Image src="/images/logo.png" alt="Directorio Yajalon" fill className="object-contain drop-shadow-2xl" priority />
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">Beneficios de estar en el directorio</h2>
            <p className="mt-3 text-lg text-gray-600">Una vitrina completa para tu negocio, lista en minutos.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-5" />
                <div className="relative space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl font-semibold text-emerald-700">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">Planes claros, sin letra chica</h2>
            <p className="mt-3 text-lg text-gray-600">Empieza gratis y sube de nivel cuando necesites mas visibilidad.</p>
          </div>
          <div className="mt-12 grid gap-14 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.title}
                className={`relative overflow-hidden rounded-3xl border-2 bg-white p-10 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  plan.popular ? 'border-emerald-500 shadow-emerald-500/20' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1 text-xs font-bold uppercase text-white shadow">
                    {plan.badge}
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-gray-900">{plan.title}</h3>
                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-10 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-gray-700">
                      <span className="font-bold text-emerald-500">-</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/registro-negocio"
                  className={`mt-10 block w-full rounded-xl bg-gradient-to-r ${plan.gradient} px-6 py-4 text-center text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-700 px-6 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ffffff,transparent_35%),radial-gradient(circle_at_80%_0%,#c7f9cc,transparent_25%)] opacity-20" />
        <div className="relative mx-auto max-w-4xl space-y-4 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Listo para crecer tu negocio?</h2>
          <p className="text-lg text-emerald-50 md:text-xl">Unete al directorio mas visitado de Yajalon y recibe mas clientes desde hoy mismo.</p>
          <Link
            href="/registro-negocio"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-lg font-bold text-emerald-600 shadow-2xl transition-all hover:scale-105"
          >
            Registrar mi Negocio Ahora
          </Link>
          <p className="text-sm text-emerald-100">Solo 5 minutos - 100% gratis para empezar</p>
        </div>
      </section>
    </main>
  );
}
