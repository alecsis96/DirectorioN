'use client';

import { useRef } from 'react';
import Link from 'next/link';
import BusinessCardVertical from './BusinessCardVertical';
import type { BusinessPreview } from '../types/business';

type Props = {
  title: string;
  subtitle?: string;
  items: BusinessPreview[];
  href?: string;
  viewMoreLabel?: string;
  onViewDetails?: (business: BusinessPreview) => void;
};

/**
 * BusinessCarousel - Carrusel horizontal con scroll-snap
 * 
 * Muestra hasta 6 negocios en scroll horizontal con comportamiento nativo:
 * - scroll-snap-type: x mandatory en el contenedor
 * - scroll-snap-align: start en cada tarjeta
 * - Peek effect: se ve ~10-15% de la siguiente tarjeta en móvil
 * - Sin librerías externas, solo CSS nativo
 */
export default function BusinessCarousel({
  title,
  subtitle,
  items,
  href = '/negocios',
  viewMoreLabel = 'Ver más',
  onViewDetails,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limitar a 6 items máximo
  const displayItems = items.slice(0, 6);

  // No renderizar si no hay items
  if (displayItems.length === 0) {
    return null;
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <Link
            href={href}
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            {viewMoreLabel}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Botones de navegación (desktop only) */}
          <button
            onClick={scrollLeft}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
            aria-label="Anterior"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={scrollRight}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
            aria-label="Siguiente"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scroll Container con scroll-snap */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {displayItems.map((business) => (
              <div
                key={business.id}
                className="flex-shrink-0 w-[85%] sm:w-[45%] md:w-[32%] lg:w-[23%]"
                style={{
                  scrollSnapAlign: 'start',
                }}
              >
                <BusinessCardVertical
                  business={business}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}

            {/* Card "Ver más" al final (móvil) */}
            <div
              className="flex-shrink-0 w-[85%] sm:w-[45%] md:hidden"
              style={{ scrollSnapAlign: 'start' }}
            >
              <Link
                href={href}
                className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 transition-all group"
              >
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-emerald-900 mb-2">{viewMoreLabel}</p>
                  <p className="text-sm text-emerald-700">Descubre más negocios</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Botón Ver más (móvil) */}
        <div className="mt-6 md:hidden">
          <Link
            href={href}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md"
          >
            {viewMoreLabel}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
