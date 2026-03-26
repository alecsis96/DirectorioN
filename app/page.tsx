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
  Sparkles,
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
  "Tu negocio aparece con perfil profesional, categoria clara y CTA directo a WhatsApp.",
  "Las promociones ganan visibilidad arriba de los listados y empujan urgencia real.",
  "Puedes empezar con registro directo y luego escalar a mayor visibilidad.",
  "La alta asistida elimina la friccion para negocios con baja adopcion digital.",
];

const ASSISTED_STEPS = [
  "Fotos de tu negocio",
  "WhatsApp y direccion",
  "Horario y categoria",
];

export const metadata: Metadata = {
  title: "Consigue mas clientes en Yajalon | YajaGon",
  description:
    "YajaGon ayuda a negocios locales a conseguir contactos por WhatsApp, mostrar promociones y registrarse con ayuda si hace falta.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "YajaGon | Mas clientes y promociones locales en Yajalon",
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

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-slate-950">
      <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:pt-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,122,71,0.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(201,156,62,0.18),transparent_24%),linear-gradient(180deg,#f3eee2_0%,#f8f6f1_46%,#f5f1e8_100%)]" />
        <div className="absolute left-[-120px] top-16 h-72 w-72 rounded-full bg-[#dfeadf] blur-3xl" />
        <div className="absolute right-[-60px] top-20 h-64 w-64 rounded-full bg-[#f0dfb2] blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e4d8] bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f7a47] backdrop-blur">
              <Megaphone className="h-3.5 w-3.5" />
              Clientes + WhatsApp + alta facil
            </div>
            <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-[4.3rem]">
              Consigue mas clientes para tu negocio en Yajalon.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Aparece en YajaGon y empieza a recibir mensajes por WhatsApp hoy mismo. Sin complicaciones. Nosotros
              tambien podemos hacerlo por ti.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro-negocio?mode=new"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#0f7a47] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#0b6238] sm:text-base"
              >
                Quiero aparecer en YajaGon
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#promociones-activas"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 sm:text-base"
              >
                Ver promociones y negocios
                <Search className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <Link href="/alta-asistida" className="inline-flex items-center gap-2 font-semibold text-[#0f7a47]">
                O mandanos WhatsApp y lo subimos por ti
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="rounded-full border border-[#d8e4d8] bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
                  <span className="font-semibold text-slate-950">{metric.value}</span> {metric.label}
                </div>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#132a1c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#f8d88a]" />
              Negocios locales con contacto rapido
            </div>
          </div>

          <div className="relative">
            {featuredPromotion ? (
              <HomePromoSpotlight promotion={featuredPromotion} />
            ) : (
              <div className="rounded-[32px] border border-[#d9c58f] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)] p-7 shadow-[0_28px_90px_rgba(108,74,17,0.14)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Alta asistida rapida</p>
                <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-slate-950">
                  No sabes subir tu negocio o no tienes tiempo?
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  Mandanos fotos, WhatsApp, direccion y horario. Nosotros lo publicamos para que empieces a recibir
                  contactos sin enredarte con formularios.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-white px-3 py-1">Fotos</span>
                  <span className="rounded-full bg-white px-3 py-1">WhatsApp</span>
                  <span className="rounded-full bg-white px-3 py-1">Direccion</span>
                  <span className="rounded-full bg-white px-3 py-1">Horario</span>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/alta-asistida"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0f7a47] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
                  >
                    Solicitar ayuda
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={footerWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Mandar WhatsApp
                    <MessageCircle className="h-4 w-4" />
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Promociones activas hoy</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Menos scroll pasivo. Mas razones para escribir ya.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Este bloque existe para empujar accion, no para decorar la home. Oferta clara, urgencia corta y CTA a WhatsApp.
              </p>
            </div>
            <Link href="/negocios" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f7a47]">
              Ver todos los negocios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {secondaryPromotions.map((promotion) => (
              <HomePromotionCard key={promotion.business.id} promotion={promotion} />
            ))}

            {secondaryPromotions.length < 2 ? (
              <article className="rounded-[28px] border border-dashed border-[#d8c27b] bg-[#fffaf0] p-6 shadow-sm">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">
                      Espacio comercial
                    </p>
                    <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950">
                      Tu promocion puede aparecer aqui.
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Si el negocio publica una oferta clara y tiene WhatsApp activo, esta zona empuja clics rapido sin
                      convertir la home en otro listado largo.
                    </p>
                  </div>
                  <div className="mt-8 flex flex-col gap-3">
                    <Link
                      href="/registro-negocio?mode=new"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#0f7a47] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
                    >
                      Registrar negocio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/alta-asistida"
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#d9c58f] bg-white px-5 py-3 text-sm font-semibold text-[#8f5b14] transition hover:bg-[#fff7ea]"
                    >
                      Solicitar alta asistida
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Categorias populares</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Explorar debe sentirse rapido y obvio.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Las categorias no son relleno: son atajos comerciales para entrar donde ya existe demanda.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homeData.popularCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group rounded-[26px] border border-[#dbe6dd] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ef] text-2xl">
                    {category.icon}
                  </div>
                  <span className="rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f5b14]">
                    {category.count > 0 ? `${category.count} activos` : "Categoria lista"}
                  </span>
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-slate-950">
                  {category.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{category.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f7a47]">
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
          <div className="rounded-[32px] bg-[#132a1c] p-7 text-white shadow-[0_28px_90px_rgba(19,42,28,0.16)] sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7e5d9]">
              Para negocios
            </p>
            <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Tu negocio no necesita un directorio. Necesita conversaciones y confianza.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d8e7da] sm:text-base">
              El bloque comercial ya no vende "gratis para siempre". Vende visibilidad, contactos por WhatsApp,
              promociones y una presencia que se vea seria desde la primera visita.
            </p>

            <div className="mt-7 space-y-3">
              {BUSINESS_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#f8d88a]" />
                  <p className="text-sm leading-6 text-[#eef6ef]">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <article className="rounded-[30px] border border-[#dbe6dd] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Registro directo</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950">
                Si ya tienes la info lista, entra al alta en este momento.
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Ideal si ya cuentas con fotos, direccion, WhatsApp y horario. Vas directo al wizard y dejas el
                negocio encaminado para publicarse.
              </p>
              <Link
                href="/registro-negocio?mode=new"
                className="mt-6 inline-flex items-center gap-2 rounded-[20px] bg-[#0f7a47] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
              >
                Crear perfil de negocio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            <article className="rounded-[30px] border border-[#d9c58f] bg-[#fff8ea] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Alta asistida</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950">
                Si no tienes tiempo, nosotros lo registramos por ti.
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Esta via debe verse central porque en mercado local vale mas ayudar a publicar que esperar a que el
                negocio complete solo el proceso digital.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/alta-asistida"
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#8f5b14] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#75480f]"
                >
                  Solicitar alta asistida
                </Link>
                <a
                  href={footerWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#d4ba7a] bg-white px-5 py-3 text-sm font-semibold text-[#8f5b14] transition hover:bg-[#fff4d9]"
                >
                  Hablar por WhatsApp
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-[#d9c58f] bg-[linear-gradient(180deg,#fff8ea_0%,#f7f1e6_100%)] shadow-[0_28px_90px_rgba(108,74,17,0.12)]">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Alta asistida directa</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                No tienes tiempo o no sabes subir tu negocio? Nosotros lo hacemos por ti.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
                Solo mandanos WhatsApp con fotos, direccion, horario y tu numero de contacto. Lo publicamos contigo
                para que empieces a recibir mensajes sin meterte a un proceso pesado.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {ASSISTED_STEPS.map((step) => (
                  <span key={step} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[280px]">
              <Link
                href="/alta-asistida"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#0f7a47] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#0b6238]"
              >
                Solicitar alta asistida
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={footerWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Mandar WhatsApp ahora
                <MessageCircle className="h-4 w-4" />
              </a>
              <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-[#8f5b14]">
                Respuesta rapida para negocios de Yajalon
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">Escaparates de visibilidad</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Los niveles comerciales ahora se entienden en un vistazo.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Patrocinado domina, destacado gana presencia y organico sigue viendose digno. Eso corrige la igualdad
                visual que hoy aplana la monetizacion y confunde el valor de cada plan.
              </p>
            </div>
            <Link href="/para-negocios" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f7a47]">
              Ver opciones para negocios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {homeData.hasBusinesses ? (
            <div className="mt-8 space-y-8">
              {homeData.sponsorShowcase.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#8f5b14]">
                    <Megaphone className="h-4 w-4" />
                    Patrocinado
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    {homeData.sponsorShowcase.map((business) => (
                      <HomeBusinessCard key={business.id} business={business} variant="sponsor" />
                    ))}
                  </div>
                </div>
              ) : null}

              {homeData.featuredShowcase.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Sparkles className="h-4 w-4 text-[#8f5b14]" />
                    Destacados
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {homeData.featuredShowcase.map((business) => (
                      <HomeBusinessCard key={business.id} business={business} variant="featured" />
                    ))}
                  </div>
                </div>
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
            <div className="mt-8 rounded-[30px] border border-dashed border-[#d8c27b] bg-white p-8 text-center shadow-sm">
              <h3 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                La vitrina premium ya esta lista.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Cuando entren mas negocios destacados y patrocinados, esta seccion puede crecer sin volver la home un catalogo.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl rounded-[36px] bg-[#132a1c] px-6 py-10 text-white shadow-[0_28px_90px_rgba(19,42,28,0.18)] sm:px-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7e5d9]">Ultimo CTA</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Tu negocio puede empezar a recibir contactos hoy mismo.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d8e7da] sm:text-base">
                Si ya tienes la informacion, entra al registro. Si no quieres lidiar con formularios, pide alta
                asistida y lo dejamos visible contigo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro-negocio?mode=new"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-white px-6 py-4 text-sm font-semibold text-[#132a1c] transition hover:bg-[#eef6ef] sm:text-base"
              >
                Registrar negocio
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/alta-asistida"
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-white/18 bg-white/10 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/16 sm:text-base"
              >
                Solicitar alta asistida
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ddd6c8] bg-[#f0eadf] px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f5b14]">YajaGon</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950">
              Escaparate local para clientes, promociones y altas asistidas.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Hecho para Yajalon, Chiapas. Menos ruido de directorio, mas claridad para descubrir y mas caminos para
              que los negocios reciban mensajes reales.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-950">Acciones clave</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link href="/negocios" className="transition hover:text-slate-950">
                Explorar negocios
              </Link>
              <Link href="/registro-negocio?mode=new" className="transition hover:text-slate-950">
                Registrar mi negocio
              </Link>
              <Link href="/alta-asistida" className="transition hover:text-slate-950">
                Solicitar alta asistida
              </Link>
              <Link href="/para-negocios" className="transition hover:text-slate-950">
                Ver propuesta para negocios
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-950">Confianza local</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <span>Atencion local para negocios de Yajalon.</span>
              <a href={footerWhatsAppHref} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-950">
                Hablar por WhatsApp
              </a>
              <Link href="/mis-solicitudes" className="transition hover:text-slate-950">
                Revisar una solicitud
              </Link>
              <Link href="/ayuda" className="transition hover:text-slate-950">
                Ayuda y soporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
