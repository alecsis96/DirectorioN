'use client';

import React, { useEffect, useState } from 'react';
import { FiCheck, FiEye, FiMessageCircle, FiShield, FiStar, FiZap } from 'react-icons/fi';

type PlanTier = 'free' | 'premium';

interface PricingHeroProps {
  categoryId?: string;
  onSelectPlan?: (plan: PlanTier) => void;
  showAltaAsistida?: boolean;
}

export default function PricingHero({
  categoryId = 'general',
  onSelectPlan,
  showAltaAsistida = true,
}: PricingHeroProps) {
  const [premiumAvailability, setPremiumAvailability] = useState({
    available: true,
    slotsLeft: 3,
  });

  useEffect(() => {
    async function checkAvailability() {
      try {
        const response = await fetch(`/api/scarcity?categoryId=${categoryId}&plan=sponsor`);
        const result = await response.json();

        setPremiumAvailability({
          available: Boolean(result?.canUpgrade ?? true),
          slotsLeft: Number(result?.slotsLeft ?? 3),
        });
      } catch (error) {
        console.error('Error checking premium availability:', error);
      }
    }

    checkAvailability();
  }, [categoryId]);

  const handleSelectPlan = (plan: PlanTier) => {
    onSelectPlan?.(plan);
  };

  return (
    <div className="rounded-[32px] border border-emerald-100 bg-gradient-to-b from-[#f8fbf9] to-white px-4 py-10 shadow-sm sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <FiZap />
            Free + Premium + campanas
          </div>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Empieza gratis y activa premium cuando quieras mas visibilidad
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            El perfil base te pone en circulacion. Premium te da mas presencia, mejor vitrina y prioridad donde mas se nota.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
                <FiShield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Free</p>
                <h3 className="text-2xl font-bold text-slate-950">Presencia base</h3>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-5xl font-bold text-slate-950">$0</div>
              <p className="mt-1 text-sm text-slate-500">Empieza sin costo</p>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-emerald-600" />
                Perfil con datos, fotos y boton a WhatsApp
              </li>
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-emerald-600" />
                Presencia en busqueda y categorias
              </li>
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-emerald-600" />
                Listo para activar campanas despues
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('free')}
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Crear perfil base
            </button>
          </article>

          <article className="relative overflow-hidden rounded-[32px] border border-[#d8c27b] bg-[linear-gradient(180deg,#fffaf0_0%,#fff5de_28%,#ffffff_100%)] p-6 shadow-[0_24px_80px_rgba(108,74,17,0.16)] ring-1 ring-[#f1dea8] sm:p-8">
            <div className="absolute right-5 top-5 rounded-full bg-[#7a4b00] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg">
              Premium
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#fff0c5] p-3 text-[#8f5b14]">
                <FiStar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8f5b14]">Plan de pago unico</p>
                <h3 className="text-3xl font-bold text-slate-950">Mas visibilidad local</h3>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end gap-2">
                <div className="text-5xl font-bold text-slate-950">$199</div>
                <div className="pb-1 text-slate-500">/ mes</div>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#8f5b14]">
                Mejor presencia en home, vitrinas y listados
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiEye className="text-[#8f5b14]" />
                  Mas presencia visual
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Card premium, prioridad en vitrinas y mejor lectura en scroll.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiMessageCircle className="text-[#0f7a47]" />
                  Mas contactos directos
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  WhatsApp mas visible y mejor empuje cuando alguien ya esta listo para escribir.
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-[#8f5b14]" />
                Todo lo del plan free
              </li>
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-[#8f5b14]" />
                Mayor prioridad en home y listados
              </li>
              <li className="flex items-start gap-2">
                <FiCheck className="mt-0.5 text-[#8f5b14]" />
                Presencia premium permanente
              </li>
            </ul>

            {premiumAvailability.slotsLeft <= 3 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {premiumAvailability.available
                  ? `Quedan ${premiumAvailability.slotsLeft} espacios premium en tu zona.`
                  : 'La visibilidad premium de tu zona esta ocupada por ahora.'}
              </div>
            ) : null}

            <button
              onClick={() => handleSelectPlan('premium')}
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#0f7a47] px-5 py-4 text-base font-bold text-white transition hover:bg-[#0b6238]"
            >
              Quiero activar premium
            </button>
          </article>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Campanas aparte</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950">Promociones temporales sin cambiar tu plan</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Usa campanas para empujar una oferta puntual, aparecer en hero o carruseles y mandar clic directo a WhatsApp.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FiZap className="text-[#8f5b14]" />
                  Hero o carrusel
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FiMessageCircle className="text-[#0f7a47]" />
                  CTA a WhatsApp
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <FiZap className="text-rose-500" />
                  Duracion configurable
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAltaAsistida ? (
          <div className="mt-8 rounded-[28px] bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white shadow-xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                Alta asistida
              </div>
              <h3 className="mt-4 text-3xl font-bold md:text-4xl">
                No tienes tiempo? Nosotros lo hacemos por ti
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-orange-50">
                Mandanos WhatsApp, fotos y horario. Nosotros dejamos tu negocio listo para publicar.
              </p>
              <button
                onClick={() => {
                  const mensaje = encodeURIComponent(
                    'Hola, quiero ayuda para publicar mi negocio en YajaGon y revisar el plan premium.'
                  );
                  window.open(`https://wa.me/5219191565865?text=${mensaje}`, '_blank');
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-orange-600 transition hover:bg-orange-50"
              >
                <FiMessageCircle />
                Quiero ayuda por WhatsApp
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
