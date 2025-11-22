

// components/BusinessDetailView.tsx

'use client';

import { onAuthStateChanged } from "firebase/auth";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import dynamic from "next/dynamic";

import type { ReactImageGalleryItem } from "react-image-gallery";

import "react-image-gallery/styles/css/image-gallery.css";

import BusinessHours from "./BusinessHours";
import type { Business } from "../types/business";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { optionalPublicEnv } from "../lib/env";
import { deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { waLink, mapsLink, normalizeDigits } from "../lib/helpers/contact";
import { trackPageView, trackBusinessInteraction, trackCTA } from "../lib/telemetry";

import { upsertReview, reviewsQuery, ReviewSchema } from "../lib/firestore/reviews";
import { hasAdminOverride } from "../lib/adminOverrides";



// Carga dinamica para evitar problemas de SSR con react-image-gallery

const ImageGallery = dynamic(() => import("react-image-gallery"), {

  ssr: false

}) as React.ComponentType<any>;

// Carga dinámica para BusinessMapComponent (usa google.maps)
const BusinessMapComponent = dynamic(() => import("./BusinessMapComponent"), {
  ssr: false
}) as React.ComponentType<any>;

const ReportBusinessModal = dynamic(() => import("./ReportBusinessModal"), {
  ssr: false
}) as React.ComponentType<any>;



type ReviewDoc = {

  id: string;

  name: string;

  text: string;

  rating: number;

  userId: string;

  created?: any;

  updated?: any;

};

const readSaveDataPreference = () => {
  if (typeof navigator === "undefined") return false;
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  return Boolean(connection?.saveData);
};



interface Props {

  business: Business;

}



export default function BusinessDetailView({ business }: Props) {
  const businessId = typeof business.id === "string" ? business.id : undefined;





  // ---------- Galeria ----------

  const galleryItems = useMemo<ReactImageGalleryItem[]>(() => {

    const urls: string[] = [];

    const cloud = (business as any)?.images as { url?: string | null }[] | undefined;

    if (cloud?.length) {

      urls.push(

        ...cloud

          .map((item) => (typeof item?.url === "string" ? item.url.trim() : ""))

          .filter((u) => /^https?:\/\//i.test(u))

      );

    }

    [business.image1, business.image2, business.image3]

      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))

      .forEach((u) => urls.push(u.trim()));



    const unique = Array.from(new Set(urls));

    return unique.slice(0, 10).map((url) => ({ original: url, thumbnail: url }));

  }, [business]);



  const renderItem = useCallback(

    (item: ReactImageGalleryItem) => {

      const src = typeof item?.original === "string" ? item.original : "";

      const altText = business.name ? `${business.name} - imagen` : "Imagen del negocio";

      if (!src) {
        return (
          <div className="relative w-full rounded-xl bg-gray-100 aspect-[3/4] flex items-center justify-center text-gray-400">
            <span>Sin imagen</span>
          </div>
        );
      }

      return (
        <div className="relative w-full rounded-xl bg-gray-100 aspect-[3/4]">
          <Image
            src={src}
            alt={altText}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain"
            loading="lazy"
          />
        </div>
      );

    },

    [business.name]

  );



  // ---------- Usuario / Resenas ----------

  const [user, setUser] = useState<null | { uid: string; displayName?: string | null; email?: string | null }>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [reviews, setReviews] = useState<ReviewDoc[]>([]);

  const [reviewText, setReviewText] = useState("");

  const [reviewRating, setReviewRating] = useState(5);

  const [reviewName, setReviewName] = useState("");

  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [saveData, setSaveData] = useState<boolean | null>(null);
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Detectar cuando el componente está montado en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    trackPageView('detail', {
      businessId,
      businessName: business.name,
      category: business.category,
    });
  }, [businessId, business.name, business.category]);



  // Normaliza correos

  const ownerEmail = (business.ownerEmail || "").toLowerCase();

  const userEmail = (user?.email || "").toLowerCase();



  // Dueno por uid o por correo; o admin

  const isOwnerByUid = Boolean(user?.uid && business.ownerId && user.uid === business.ownerId);

  const isOwnerByEmail = Boolean(userEmail && ownerEmail && userEmail === ownerEmail);

  const canManage = (isOwnerByUid || isOwnerByEmail || isAdmin) && !!business.id;



  const dashboardHref = business.id ? `/dashboard/${business.id}` : "/dashboard";





  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (u) => {

      setUser(u as any);

      if (u) {
        try {
          const tr = await u.getIdTokenResult();
          const email = (tr.claims?.email as string | undefined) || u.email;
          setIsAdmin(tr.claims?.admin === true || hasAdminOverride(email));
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

    });

    return () => unsub();

  }, []);

  useEffect(() => {

    if (typeof window === "undefined") return;
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const connection =

      (navigator as any).connection ||

      (navigator as any).mozConnection ||

      (navigator as any).webkitConnection;

    const updatePreference = () => setSaveData(readSaveDataPreference());

    updatePreference();

    if (connection?.addEventListener) {

      connection.addEventListener("change", updatePreference);

      return () => connection.removeEventListener("change", updatePreference);

    }

  }, []);



  useEffect(() => {

    if (user?.displayName) setReviewName(user.displayName);

    else if (user?.email) setReviewName(user.email.split("@")[0] || "");

    else setReviewName("");

  }, [user]);



  useEffect(() => {

    if (!business?.id) return;

    const q = reviewsQuery(db, business.id);

    const unsub = onSnapshot(q, (snap) => {

      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReviewDoc[];

      setReviews(list);

      if (user?.uid) {

        const own = list.find((r) => r.userId === user.uid);

        setUserReviewId(own?.id ?? null);

      } else {

        setUserReviewId(null);

      }

    });

    return () => unsub();

  }, [business?.id, user?.uid]);



  async function handleSignIn() {

    await signInWithGoogle();

  }



  // Estrellas clicables

  const Stars = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificacion">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Calificacion ${n}`}
            onClick={() => onChange(n)}
            className="text-current"
            title={`${n} estrellas`}
          >
            <StarIcon className={`w-4 h-4 ${active ? "text-yellow-500" : "text-gray-300"}`} />
          </button>
        );
      })}
    </div>
  );



  // Sanitiza texto (quita links)

  const cleanText = (s: string) => s.replace(/https?:\/\/\S+/gi, "").replace(/www\.\S+/gi, "").trim();



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault();

    setErrorMsg("");



    if (!business?.id) return setErrorMsg("Negocio no valido.");

    if (!user) return setErrorMsg("Debes iniciar sesion para dejar una resena.");

    if (isOwnerByUid || isOwnerByEmail) return setErrorMsg("No puedes dejar resena en tu propio negocio.");



    const text = cleanText(reviewText);

    const payload = {

      name: (reviewName || "").trim(),

      text,

      rating: reviewRating,

    };



    const parsed = ReviewSchema.safeParse(payload);

    if (!parsed.success) {

      const msg = parsed.error.issues[0]?.message || "Datos invalidos.";

      return setErrorMsg(msg);

    }



    setBusy(true);

    try {

      await upsertReview(db, business.id!, user.uid, parsed.data);

      setReviewText("");

      setErrorMsg("");

      trackBusinessInteraction(
        'review_submitted',
        businessId || '',
        business.name,
        business.category,
        { rating: parsed.data.rating }
      );

    } catch (err) {

      console.error(err);

      setErrorMsg("Hubo un problema al guardar tu resena.");

    } finally {

      setBusy(false);

    }

  }



  async function handleDeleteMyReview() {

    if (!business?.id || !user) return;

    setBusy(true);

    try {

      // si usas la estructura nueva (doc id = uid)

      await deleteDoc(doc(db, "businesses", business.id, "reviews", user.uid));

      setUserReviewId(null);

      setReviewText("");

    } catch (err) {

      console.error(err);

      setErrorMsg("No pudimos eliminar tu resena.");

    } finally {

      setBusy(false);

    }

  }



  // -------- Contacto / Mapas ----------

  const tel = normalizeDigits(business.phone);
  const callHref = tel ? `tel:${tel}` : "";
  const whatsappHref = waLink(business.WhatsApp);
  const facebookHref =
    typeof business.Facebook === "string" && business.Facebook.trim().length
      ? business.Facebook.startsWith("http")
        ? business.Facebook
        : `https://${business.Facebook}`
      : "";
  const lat =
    typeof business.location?.lat === "number"
      ? business.location.lat
      : typeof (business as any).lat === "number"
      ? (business as any).lat
      : null;
  const lng =
    typeof business.location?.lng === "number"
      ? business.location.lng
      : typeof (business as any).lng === "number"
      ? (business as any).lng
      : null;

  const mapHref = mapsLink(lat, lng, business.address || business.name);
  const hasMapLink = Boolean(mapHref && mapHref !== "#");

  const googleKey = optionalPublicEnv("NEXT_PUBLIC_GOOGLE_MAPS_KEY");
  const dataSaverEnabled = saveData === true;
  const canEmbed = !dataSaverEnabled && lat != null && lng != null;
  let embedSrc: string | null = null;
  if (canEmbed) {
    embedSrc = googleKey
      ? `https://www.google.com/maps/embed/v1/view?key=${googleKey}&center=${lat},${lng}&zoom=16`
      : `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }
  const planValue = String((business as any)?.plan ?? "").toLowerCase();
  const hasPremiumGallery = planValue === "featured" || planValue === "sponsor";

  // Helper para tracking de eventos en esta vista
  const trackDetailCTA = useCallback(
    (type: 'call' | 'whatsapp' | 'maps' | 'facebook') => {
      trackCTA(type, businessId || '', business.name);
    },
    [businessId, business.name]
  );

  const trackDetailInteraction = useCallback(
    (event: string) => {
      trackBusinessInteraction(
        event as any,
        businessId || '',
        business.name,
        business.category
      );
    },
    [businessId, business.name, business.category]
  );

  const handleMapClick = useCallback(() => {
    if (!hasMapLink) return;
    trackDetailCTA('maps');
  }, [trackDetailCTA, hasMapLink]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    console.info("detail_render", {
      id: business.id,
      saveData: dataSaverEnabled,
      hasGallery: hasPremiumGallery && !dataSaverEnabled && galleryItems.length > 0,
      hasMap: Boolean(embedSrc),
    });
  }, [business.id, dataSaverEnabled, hasPremiumGallery, galleryItems.length, embedSrc]);


  // -------- JSON-LD (SEO Local) ----------

  const ldLocalBusiness = useMemo(() => {

    const images = galleryItems.map((i) => i.original).slice(0, 3);
    const ratingNumber = Number(business.rating || 0);
    const sameAsLinks = facebookHref ? [facebookHref] : undefined;

    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: business.name,
      address: business.address,
      telephone: tel || undefined,
      image: images.length ? images : undefined,
      sameAs: sameAsLinks,
      priceRange: business.price || "MXN",
      url: pageUrl,
      aggregateRating:
        ratingNumber > 0
          ? {
            "@type": "AggregateRating",
            ratingValue: ratingNumber.toFixed(1),
            reviewCount: Math.max(1, reviews.length || 0),
          }
          : undefined,
    };
  }, [business, facebookHref, galleryItems, reviews.length, tel, pageUrl]);

  return (
    <div className="space-y-10 md:max-w-5xl md:mx-auto md:px-6 lg:max-w-6xl lg:px-8">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness) }}
      />

      {/* Header */}
      {/* Mapa */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              {(business as any).plan === 'sponsor' && (
                <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                  Patrocinado
                </span>
              )}
              {(business as any).plan === 'featured' && (
                <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                  Destacado
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">
              {business.category && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{business.category}</span>
              )}
              {business.colonia && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>
              )}
              <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                <StarIcon className="w-4 h-4 text-yellow-500" />
                {Number(business.rating ?? 0).toFixed(1)}
              </span>
            </div>

            {business.address && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Dirección:</strong>{" "}
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38761D] hover:underline"
                  aria-label={`Abrir direccion de ${business.name} en Google Maps`}
                  onClick={handleMapClick}
                >
                  {business.address}
                </a>
              </p>
            )}

            {/* Dynamic Business Hours with Open/Closed Status */}
            <BusinessHours hours={business.hours} horarios={business.horarios} />

            {business.price && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Precio:</strong> {business.price}
              </p>
            )}
          </div>



          <div className="flex flex-col gap-2 w-full md:w-52">
            {callHref && (
              <a
                href={callHref}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                aria-label={`Llamar a ${business.name}`}
                onClick={() => trackDetailCTA('call')}
              >
                <PhoneIcon className="w-4 h-4" /> Llamar
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition"
                aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                onClick={() => trackDetailCTA('whatsapp')}
              >
                <WhatsappIcon className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {hasMapLink && (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 transition"
                aria-label={`Como llegar a ${business.name}`}
                onClick={handleMapClick}
              >
                <LocationIcon className="w-4 h-4" /> Como llegar
              </a>
            )}
            {facebookHref && (
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
                aria-label={`Abrir Facebook de ${business.name}`}
                onClick={() => trackDetailCTA('facebook')}
              >
                <FacebookIcon className="w-4 h-4" /> Facebook
              </a>
            )}
            {canManage && (
              <a
                href={dashboardHref}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition"
                aria-label="Gestionar negocio"
                onClick={() => trackDetailInteraction('dashboard_viewed')}
              >
                Gestionar negocio
              </a>
            )}
            
            {/* Botón de reportar */}
            {!canManage && (
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
                aria-label="Reportar problema con este negocio"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                Reportar
              </button>
            )}
          </div>

        </div>

      </section>
      
      {/* Modal de reporte */}
      {showReportModal && businessId && (
        <ReportBusinessModal
          businessId={businessId}
          businessName={business.name}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            // Opcional: mostrar un toast de éxito
            console.log('Reporte enviado exitosamente');
          }}
        />
      )}



      {/* Galeria */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Galeria</h2>
        {hasPremiumGallery ? (
          dataSaverEnabled ? (
            <p className="text-sm text-gray-500">Modo ahorro de datos activo: omitimos la galeria para cuidar tu plan.</p>
          ) : galleryItems.length ? (
            <div className="relative max-w-lg mx-auto">
              <div className="relative w-full overflow-y-auto touch-pan-y overscroll-y-contain">
                <ImageGallery
                  items={galleryItems}
                  showPlayButton={false}
                  showFullscreenButton={galleryItems.length > 0}
                  showThumbnails={false}
                  showBullets={galleryItems.length > 1}
                  slideDuration={350}
                  slideInterval={5000}
                  renderItem={renderItem}
                  additionalClass="business-gallery"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Este negocio aun no tiene imagenes.</p>
          )
        ) : (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold text-gray-800 mb-2">Galeria de fotos</p>
            <p className="text-sm text-gray-600 mb-4">
              La galeria completa esta disponible solo para planes <span className="font-bold text-orange-600">Destacado</span> o <span className="font-bold text-purple-600">Patrocinado</span>.
            </p>
            <p className="text-xs text-gray-500">
              Eres dueño? <Link prefetch={false} href="/registro-negocio" className="text-[#38761D] font-semibold underline">Mejora tu plan aqui</Link>
            </p>
          </div>
        )}
      </section>

      {/* Descripcion */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripción</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {business.description || "Sin descripcion disponible."}
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🗺️ Ubicación
        </h2>
        {!dataSaverEnabled && (lat != null && lng != null) ? (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            {isMounted ? (
              <BusinessMapComponent business={business} height="400px" zoom={16} />
            ) : (
              <div className="h-[400px] flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-gray-600 mb-4">
              {dataSaverEnabled 
                ? "Modo ahorro de datos activo: mapa deshabilitado." 
                : "No hay coordenadas disponibles para mostrar el mapa."}
            </p>
            {hasMapLink && (
              <a
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2d5418] transition shadow-md"
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir ubicacion de ${business.name} en Google Maps`}
                onClick={handleMapClick}
              >
                🧭 Abrir en Google Maps
              </a>
            )}
          </div>
        )}
      </section>

      {/* Resenas */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reseas de clientes</h2>
        {errorMsg && <div className="text-sm text-red-500 font-semibold mb-3">{errorMsg}</div>}

        {!user ? (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            onClick={handleSignIn}
          >
            Iniciar sesion con Google para dejar una resena
          </button>

        ) : (

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <input
                type="text"
                value={reviewName}
                disabled
                className="border rounded px-3 py-2 flex-1 bg-gray-100 text-gray-600"
                placeholder="Tu nombre"
                aria-readonly
              />
              <Stars value={reviewRating} onChange={setReviewRating} />
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Comparte tu experiencia"
              className="border rounded px-3 py-2 w-full h-28"
              maxLength={300}
            />

            <div className="text-xs text-gray-500">{reviewText.length}/300</div>



            <div className="flex gap-2">

              <button

                type="submit"

                className="px-4 py-2 bg-[#38761D] text-white rounded-lg font-semibold disabled:opacity-50"

                disabled={busy}

              >

                {userReviewId ? "Guardar cambios" : "Enviar resena"}

              </button>

              {userReviewId && (

                <button

                  type="button"

                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50"

                  onClick={handleDeleteMyReview}

                  disabled={busy}

                >

                  Borrar mi resena

                </button>

              )}

              <button

                type="button"

                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"

                onClick={() => auth.signOut()}

              >

                Cerrar sesion

              </button>

            </div>

          </form>

        )}



        <div className="space-y-3">

          {reviews.length === 0 && (

            <p className="text-sm text-gray-500">Aun no hay resenas. Se el primero en compartir tu opinion.</p>

          )}

          {reviews.map((review) => {

            const created =

              (review.created?.toDate?.() as Date | undefined) ||

              (review.created ? new Date(review.created) : undefined);

            const stars = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0)));

            return (

              <div key={review.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                <div className="flex items-center gap-3 mb-1">

                  <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold uppercase">

                    {review.name?.charAt(0) || "?"}

                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-800">{review.name}</p>

                    {created && (

                      <p className="text-xs text-gray-500">{created.toLocaleDateString("es-MX")}</p>

                    )}

                  </div>

                  <span className="ml-auto text-yellow-500 flex items-center gap-1" aria-label={`Calificacion ${stars}`}>

                    {Array.from({ length: stars }).map((_, idx) => (

                      <StarIcon key={idx} className="w-4 h-4 text-yellow-500" />

                    ))}

                  </span>

                </div>

                <p className="text-sm text-gray-700 whitespace-pre-line">{review.text}</p>

                {user?.uid && review.userId === user.uid && (

                  <div className="mt-2 flex gap-2 text-xs">

                    <button

                      className="px-3 py-1 bg-yellow-400 text-white rounded"

                      onClick={() => {

                        setReviewText(review.text);

                        setReviewRating(review.rating);

                        setUserReviewId(review.id);

                      }}

                    >

                      Editar

                    </button>

                    <button

                      className="px-3 py-1 bg-red-500 text-white rounded"

                      onClick={handleDeleteMyReview}

                    >

                      Eliminar

                    </button>

                  </div>

                )}

              </div>

            );

          })}

        </div>

      </section>

    </div>

  );

}

type IconProps = React.SVGProps<SVGSVGElement>;

const StarIcon = ({ className = "w-4 h-4", ...props }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M10 1.5l2.4 4.9 5.4.78-3.9 3.75.92 5.32L10 13.88l-4.82 2.37.92-5.32-3.9-3.75 5.4-.78z" />
  </svg>
);

const PhoneIcon = ({ className = "w-4 h-4", ...props }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M6.5 2a1 1 0 0 0-1 1.1c.2 3.08 1.3 5.7 3.3 7.7 2 2 4.62 3.1 7.7 3.3a1 1 0 0 0 1.1-1l-.08-2.14a1 1 0 0 0-1-.96h-2.07a1 1 0 0 0-.93.66l-.42 1.14a8.44 8.44 0 0 1-3.86-3.86l1.14-.42a1 1 0 0 0 .66-.93V4.48a1 1 0 0 0-.96-1L6.5 2z" />
  </svg>
);

const WhatsappIcon = ({ className = "w-4 h-4", ...props }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M10 1.75a7.25 7.25 0 0 0-6.24 11.09L3 18.5l5.84-1.64A7.25 7.25 0 1 0 10 1.75zm0 1.5a5.75 5.75 0 1 1 0 11.5 5.7 5.7 0 0 1-2.66-.66l-.25-.14-3.05.86.84-2.95-.15-.25A5.7 5.7 0 0 1 10 3.25zm-2 2.5a.8.8 0 0 0-.76.5 3.9 3.9 0 0 0 .47 3.62 4.75 4.75 0 0 0 3 1.93.8.8 0 0 0 .79-.36l.48-.72a.4.4 0 0 0-.12-.54l-1.03-.69a.4.4 0 0 0-.53.07l-.34.36a3.6 3.6 0 0 1-1.4-1.4l.36-.34a.4.4 0 0 0 .07-.53l-.69-1.03a.4.4 0 0 0-.54-.12z" />
  </svg>
);

const LocationIcon = ({ className = "w-4 h-4", ...props }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M10 1.5c-3.3 0-6 2.7-6 6 0 4.5 5.6 10.3 5.9 10.6a.5.5 0 0 0 .8 0c.3-.3 5.9-6.1 5.9-10.6 0-3.3-2.7-6-6-6zm0 8.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z" />
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4", ...props }: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    role="img"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M11 4.5c-.9 0-1.5.5-1.5 1.4v1.1h2.4l-.3 2.3h-2.1V16H7.4V9.3H5.6V7h1.8V5.9C7.4 3.7 8.8 2.5 10.9 2.5c.7 0 1.3.08 1.9.23V4.9a6.3 6.3 0 0 0-1.8-.4z" />
  </svg>
);
