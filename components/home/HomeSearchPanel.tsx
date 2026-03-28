import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

type QuickLink = {
  label: string;
  href: string;
};

type Props = {
  quickLinks: QuickLink[];
};

export default function HomeSearchPanel({ quickLinks }: Props) {
  return (
    <section id="buscar-negocios" className="relative z-10 -mt-12 px-4 pb-8 sm:-mt-16">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-6 sm:p-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
                <Search className="h-3.5 w-3.5 text-orange-500" />
                Busqueda rapida
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Busca negocio, comida o servicio.
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-gray-500">
                Escribe lo que necesitas y entra directo a opciones con WhatsApp.
              </p>

              <form action="/negocios" method="get" className="mt-6">
                <label htmlFor="home-search" className="sr-only">
                  Buscar negocios
                </label>
                <div className="flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] bg-white px-4 py-4 shadow-sm">
                    <Search className="h-5 w-5 flex-shrink-0 text-gray-500" />
                    <input
                      id="home-search"
                      name="q"
                      type="search"
                      placeholder="Ej. polleria, tacos, cafe, refacciones, abogado..."
                      className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 sm:text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Buscar ahora
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {quickLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-500 hover:text-orange-500"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
              <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                  Entrada rapida
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                  Encuentra y escribe.
                </h3>
                <p className="mt-5 text-sm font-medium leading-6 text-gray-500">
                  Busca por categoria o promo y contacta en segundos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
