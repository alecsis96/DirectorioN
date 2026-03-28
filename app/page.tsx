import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  MessageCircle,
  Megaphone,
  Search,
  ShieldCheck,
} from "lucide-react";
import HomeBusinessCard from "../components/home/HomeBusinessCard";
import HomePromotionCard from "../components/home/HomePromotionCard";
import HomePromoSpotlight from "../components/home/HomePromoSpotlight";
import HomeSearchPanel from "../components/home/HomeSearchPanel";
import { buildHomePageData } from "../lib/homePage";
import { fetchBusinesses } from "../lib/server/businessData";

const ASSISTED_WHATSAPP = "5219191565865";

const QUICK_LINKS = [
  { label: "Pollerias", href: "/negocios?c=polleria_rosticeria&g=food" },
  { label: "Taquerias", href: "/negocios?c=taquerias&g=food" },
  { label: "Tiendas", href: "/negocios?c=abarrotes&g=commerce" },
  { label: "Farmacias", href: "/negocios?c=farmacias&g=health" },
  { label: "Servicios", href: "/negocios?c=servicios_generales&g=services" },
];

const BUSINESS_BENEFITS = [
  "Perfil con fotos, categoria clara y boton directo a WhatsApp.",
  "Campanas activas para mover pedidos y mensajes.",
  "Empieza hoy y activa premium cuando quieras ganar mas visibilidad.",
];

const ASSISTED_STEPS = [
  "Fotos de tu negocio",
  "WhatsApp y direccion",
  "Horario y categoria",
];

export const metadata: Metadata = {
  title: "Consigue mas clientes en Yajalon | YajaGon",
  description:
    "YajaGon ayuda a negocios locales a conseguir contactos por WhatsApp, mover campanas y registrarse con ayuda si hace falta.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "YajaGon | Mas clientes y campanas locales en Yajalon",
    description:
      "Explora negocios locales rapido o registra el tuyo para recibir contactos por WhatsApp y ganar visibilidad real.",
    type: "website",
  },
};

export const dynamic = "force-static";
export const revalidate = 60;

export default async function Home() {
  const { businesses } = await fetchBusinesses(120);
  const homeData = buildHomePageData(businesses);
  const heroMetrics = homeData.metrics.slice(0, 3);
  const featuredPromotion = homeData.promotions[0];
  const secondaryPromotions = homeData.promotions.slice(1, 3);
  const footerWhatsAppHref = `https://wa.me/${ASSISTED_WHATSAPP}?text=${encodeURIComponent(
    "Hola, quiero ayuda para publicar mi negocio en YajaGon."
  )}`;
  const mobileScrollClasses =
    "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:pt-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,146,60,0.12),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f9fafb_48%,#f9fafb_100%)]" />
        <div className="absolute left-[-120px] top-16 h-72 w-72 rounded-full bg-orange-100 blur-3xl" />
        <div className="absolute right-[-60px] top-20 h-64 w-64 rounded-full bg-gray-200 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 backdrop-blur">
              <Megaphone className="h-3.5 w-3.5" />
              Clientes + WhatsApp + campanas activas
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-[4.3rem]">
              Consigue mas clientes para tu negocio en Yajalon.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Aparece en YajaGon y empieza a recibir mensajes por WhatsApp hoy mismo. Perfil claro, campanas
              visibles y contacto rapido para que te encuentren sin dar vueltas.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro-negocio?mode=new"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600 sm:text-base"
              >
                Quiero aparecer en YajaGon
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#promociones-activas"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 sm:text-base"
              >
                Ver campanas y negocios
                <Search className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-sm text-gray-500 shadow-sm">
                  <span className="font-semibold text-orange-500">{metric.value}</span> {metric.label}
                </div>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
              Negocios locales con contacto rapido
            </div>
          </div>

          <div className="relative">
            {featuredPromotion ? (
              <HomePromoSpotlight promotion={featuredPromotion} />
            ) : (
              <div className="rounded-[32px] border border-gray-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Visibilidad que mueve clics</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  Una promo clara y un WhatsApp visible valen mas que pasar desapercibido.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-700">Activa tu perfil y haz que te encuentren sin vueltas.</p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1">WhatsApp visible</span>
                  <span className="rounded-full bg-white px-3 py-1">Campanas activas</span>
                  <span className="rounded-full bg-white px-3 py-1">Ubicacion clara</span>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/registro-negocio?mode=new"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-orange-500 px-5 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Registrar negocio
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#promociones-activas"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Ver campanas
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <HomeSearchPanel quickLinks={QUICK_LINKS} />

      <section id="promociones-activas" className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Campanas activas hoy</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Campanas para pedir hoy.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Promociones temporales con salida directa a WhatsApp.</p>
            </div>
            <Link href="/negocios" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500">
              Ver todos los negocios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className={`mt-8 md:hidden ${mobileScrollClasses}`}>
            {secondaryPromotions.map((promotion) => (
              <div key={promotion.business.id} className="min-w-[84%] snap-start">
                <HomePromotionCard promotion={promotion} />
              </div>
            ))}

            {secondaryPromotions.length < 2 ? (
              <article className="min-w-[84%] snap-start rounded-[28px] border border-dashed border-gray-300 bg-white p-6 shadow-sm">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">
                      Espacio comercial
                    </p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                      Tu campana puede aparecer aqui.
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-slate-600">Activa una campana clara y deja el WhatsApp listo para recibir pedidos.</p>
                  </div>
                  <div className="mt-8 flex flex-col gap-3">
                    <Link
                      href="/registro-negocio?mode=new"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      Registrar negocio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/para-negocios"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-orange-500"
                    >
                      Ver plan premium
                    </Link>
                  </div>
                </div>
              </article>
            ) : null}
          </div>

          <div className="mt-8 hidden gap-5 md:grid lg:grid-cols-3">
            {secondaryPromotions.map((promotion) => (
              <HomePromotionCard key={promotion.business.id} promotion={promotion} />
            ))}

            {secondaryPromotions.length < 2 ? (
              <article className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 shadow-sm">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">
                      Espacio comercial
                    </p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                      Tu campana puede aparecer aqui.
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-slate-600">Activa una campana clara y deja el WhatsApp listo para recibir pedidos.</p>
                  </div>
                  <div className="mt-8 flex flex-col gap-3">
                    <Link
                      href="/registro-negocio?mode=new"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      Registrar negocio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/para-negocios"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-orange-500"
                    >
                      Ver plan premium
                    </Link>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Categorias populares</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Encuentra rapido lo que necesitas.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Comida, tiendas y servicios en pocos toques.</p>
          </div>

          <div className={`mt-8 md:hidden ${mobileScrollClasses}`}>
            {homeData.popularCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group min-w-[82%] snap-start rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-xl">
                    {category.icon}
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">
                    {category.count > 0 ? `${category.count} activos` : "Categoria lista"}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                  {category.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{category.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-500">
                  Ver categoria
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {homeData.popularCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                    {category.icon}
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                    {category.count > 0 ? `${category.count} activos` : "Categoria lista"}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                  {category.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{category.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-500">
                  Explorar categoria
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] bg-gray-900 p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.16)] sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
              Para negocios
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Tu negocio necesita verse claro y recibir mensajes.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">Perfil claro, promos activas y contacto directo a WhatsApp.</p>

            <div className="mt-7 space-y-3">
              {BUSINESS_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                  <p className="text-sm leading-6 text-gray-200">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <article className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Registro directo</p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Si ya tienes la info lista, entra al alta en este momento.
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Ideal si ya cuentas con fotos, direccion, WhatsApp y horario. Vas directo al wizard y dejas el
                negocio encaminado para publicarse.
              </p>
              <Link
                href="/registro-negocio?mode=new"
                className="mt-6 inline-flex items-center gap-2 rounded-[20px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Crear perfil de negocio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Alta asistida directa</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                No tienes tiempo o no sabes subir tu negocio?
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
                Nosotros lo hacemos por ti. Solo mandanos WhatsApp y lo publicamos.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {ASSISTED_STEPS.map((step) => (
                  <span key={step} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[280px]">
              <a
                href={footerWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Quiero que lo hagan por mi
                <MessageCircle className="h-4 w-4" />
              </a>
              <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-orange-500">
                Respuesta rapida para negocios de Yajalon
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Visibilidad premium</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Negocios con mayor empuje visual.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Una vitrina corta para mostrar como se ve un perfil premium dentro del producto.</p>
            </div>
            <Link href="/para-negocios" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500">
              Ver plan premium
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {homeData.hasBusinesses ? (
            <div className="mt-8 space-y-6">
              {homeData.premiumShowcase.length > 0 ? (
                <>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-orange-500">
                    <Megaphone className="h-4 w-4" />
                    Premium
                  </div>
                  <div className={`md:hidden ${mobileScrollClasses}`}>
                    {homeData.premiumShowcase.map(({ business, variant }) => (
                      <div
                        key={business.id}
                        className={`${variant === "sponsor" ? "min-w-[88%]" : "min-w-[78%]"} snap-start`}
                      >
                        <HomeBusinessCard business={business} variant={variant} />
                      </div>
                    ))}
                  </div>
                  <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
                    {homeData.premiumShowcase.map(({ business, variant }) => (
                      <HomeBusinessCard key={business.id} business={business} variant={variant} />
                    ))}
                  </div>
                </>
              ) : null}
              <div className="flex justify-center">
                <Link
                  href="/negocios"
                  className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Ver todos los negocios
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[30px] border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <h3 className="text-3xl font-bold tracking-tight text-slate-950">
                La vitrina premium ya esta lista.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Cuando entren mas negocios premium, esta seccion puede crecer sin inflar la portada.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl rounded-[36px] bg-gray-900 px-6 py-10 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:px-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">Ultimo CTA</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tu negocio puede empezar a recibir contactos hoy mismo.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                Si ya tienes la informacion, entra al registro y deja tu perfil listo para recibir contactos por
                WhatsApp cuanto antes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro-negocio?mode=new"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600 sm:text-base"
              >
                Registrar negocio
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/para-negocios"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-600 bg-transparent px-6 py-4 text-sm font-semibold text-white transition hover:border-orange-500 hover:text-orange-400 sm:text-base"
              >
                Ver plan premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">YajaGon</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Escaparate local para clientes, campanas y contacto rapido.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Hecho para Yajalon, Chiapas. Mas claridad para descubrir rapido y mas caminos para que los negocios
              reciban mensajes reales.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-950">Acciones clave</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link href="/negocios" className="transition hover:text-orange-500">
                Explorar negocios
              </Link>
              <Link href="/registro-negocio?mode=new" className="transition hover:text-orange-500">
                Registrar mi negocio
              </Link>
              <Link href="/promociones" className="transition hover:text-orange-500">
                Ver campanas activas
              </Link>
              <Link href="/para-negocios" className="transition hover:text-orange-500">
                Ver plan premium
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-950">Confianza local</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <span>Atencion local para negocios de Yajalon.</span>
              <a href={footerWhatsAppHref} target="_blank" rel="noopener noreferrer" className="transition hover:text-orange-500">
                Hablar por WhatsApp
              </a>
              <Link href="/mis-solicitudes" className="transition hover:text-orange-500">
                Revisar una solicitud
              </Link>
              <Link href="/ayuda" className="transition hover:text-orange-500">
                Ayuda y soporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
