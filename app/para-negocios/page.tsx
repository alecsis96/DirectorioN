import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ParaNegociosPricingClient from '@/components/ParaNegociosPricingClient';

type Benefit = {
  icon: string;
  title: string;
  copy: string;
};

const BENEFITS: Benefit[] = [
  { icon: '01', title: 'Mas clientes', copy: 'Visibilidad inmediata ante personas de Yajalon que buscan lo que vendes.' },
  { icon: '02', title: 'Reputacion real', copy: 'Reseñas y calificaciones de usuarios reales que generan confianza.' },
  { icon: '03', title: 'Contacto directo', copy: 'Botones de WhatsApp, llamada y Google Maps para que te contacten sin friccion.' },
  { icon: '04', title: 'Panel de control', copy: 'Edita tu informacion, fotos, horarios y responde reseñas cuando quieras.' },
  { icon: '05', title: 'Gratis para empezar', copy: 'Sin tarjeta ni letras chiquitas. Empieza hoy y crece cuando necesites.' },
  { icon: '06', title: 'Sistema de favoritos', copy: 'Los usuarios pueden guardar tu negocio para encontrarte facilmente.' },
];

export const metadata: Metadata = {
  title: 'Unete al Directorio de Yajalon | Planes para tu negocio',
  description: 'Registra tu negocio en minutos, gratis. Escala a planes con mayor visibilidad cuando quieras.',
};

export default function ParaNegociosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef2f7] via-[#f4f7fb] to-[#eef2f7] text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 px-6 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_40%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 text-center md:grid md:grid-cols-2 md:items-center md:text-left">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <span className="text-yellow-200">+</span> +150 negocios ya confian en nosotros
            </div>
            <h1 className="text-4xl font-extrabold leading-tight drop-shadow-sm md:text-5xl">
              Listo para llegar a mas clientes en Yajalon?
            </h1>
            <p className="text-lg text-emerald-50 md:text-xl">
              Publica tu negocio gratis, recibe contactos por WhatsApp y aparece primero con nuestros planes destacados.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
              <Link
                href="/registro-negocio"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-lg font-bold text-emerald-700 shadow-2xl transition-all hover:scale-105 hover:shadow-emerald-500/40"
              >
                Registrar mi negocio gratis
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
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
          <div className="relative mx-auto flex h-full max-w-md justify-center md:justify-end">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-md shadow-2xl">
              <Image src="/images/logo.png" alt="Directorio Yajalon" fill className="object-contain drop-shadow-2xl" priority />
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">Por que registrarte</h2>
            <p className="mt-3 text-lg text-gray-600">Beneficios claros para crecer tu negocio sin complicaciones.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-5" />
                <div className="relative space-y-3">
                  <div className="inline-flex items-center gap-3 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold shadow-inner">{benefit.icon}</span>
                    Beneficio
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
      <section id="planes" className="px-6 py-16">
        <ParaNegociosPricingClient />
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
