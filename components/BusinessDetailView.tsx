

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
import { useBusinessHistory } from "../hooks/useBusinessHistory";

import { upsertReview, reviewsQuery, ReviewSchema } from "../lib/firestore/reviews";
import { hasAdminOverride } from "../lib/adminOverrides";

// Swiper for interactive image carousel
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';



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

  // Guardar en historial
  useBusinessHistory(business);

  // ---------- Galeria ----------
  // Collect all available images for carousel
  const allGalleryImages = useMemo<string[]>(() => {
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
    return unique.slice(0, 10);
  }, [business]);

  const galleryItems = useMemo<ReactImageGalleryItem[]>(() => {
    return allGalleryImages.map((url) => ({ original: url, thumbnail: url }));
  }, [allGalleryImages]);



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

  const ownerEmail = (business.ownerEmail || "").trim().toLowerCase();

  const userEmail = (user?.email || "").trim().toLowerCase();



  // Dueno por uid o por correo; o admin

  const isOwnerByUid = Boolean(user?.uid && business.ownerId && user.uid === business.ownerId);

  const isOwnerByEmail = Boolean(userEmail && ownerEmail && userEmail === ownerEmail);

  const canManage = (isOwnerByUid || isOwnerByEmail || isAdmin) && !!business.id;

  // Debug logs
  useEffect(() => {
    if (user && business.id) {
      console.log('[BusinessDetailView] Ownership check:', {
        userId: user.uid,
        userEmail: user.email,
        businessOwnerId: business.ownerId,
        businessOwnerEmail: business.ownerEmail,
        isOwnerByUid,
        isOwnerByEmail,
        isAdmin,
        canManage
      });
    }
  }, [user, business.ownerId, business.ownerEmail, business.id, isOwnerByUid, isOwnerByEmail, isAdmin, canManage]);



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

  // -------- Sistema de Temas por Plan ----------
  const plan = (business as any).plan || 'free';

  const theme = {
    sponsor: {
    wrapper: 'bg-white border-t-4 border-purple-500',
      headerGradient: 'bg-gradient-to-r from-purple-500 to-cyan-500',
      badge: 'bg-blue-100 text-purple-800 border-purple-200',
      buttonPrimary: 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-purple-200',
      iconColor: 'text-purple-600',
      heroHeight: 'h-48 sm:h-56',
      priceBadge: 'bg-blue-100 text-purple-800 border border-purple-300'
    },
    featured: {
      wrapper: 'bg-white border-t-4 border-blue-500',
      headerGradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      buttonPrimary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-blue-200',
      iconColor: 'text-blue-600',
      heroHeight: 'h-48 sm:h-56',
      priceBadge: 'bg-blue-100 text-blue-800 border border-blue-300'
    },
    free: {
      wrapper: 'bg-white border-t border-gray-200',
      headerGradient: 'bg-gray-100',
      badge: 'bg-gray-100 text-gray-600 border-gray-200',
      buttonPrimary: 'bg-gray-800 hover:bg-gray-900 text-white',
      iconColor: 'text-gray-600',
      heroHeight: 'h-32 sm:h-40',
      priceBadge: 'bg-gray-100 text-gray-600 border border-gray-300'
    }
  };

  const currentTheme = theme[plan as keyof typeof theme] || theme.free;

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness) }}
      />

      {/* FULL BLEED IMAGE HEADER - Edge-to-edge for premium plans */}
      {(plan === 'sponsor' || plan === 'featured') && (
        <div className={`relative w-full ${allGalleryImages.length > 1 ? 'aspect-square md:h-96' : currentTheme.heroHeight} bg-gray-200 rounded-t-2xl overflow-hidden`}>
          {/* Interactive Image Carousel - Show if multiple images exist */}
          {allGalleryImages.length > 1 ? (
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 5000, disableOnInteraction: true }}
              loop={allGalleryImages.length > 2}
              className="h-full w-full"
            >
              {allGalleryImages.map((imageUrl, index) => (
                <SwiperSlide key={index}>
                  <div className="relative w-full h-full overflow-hidden">
                    {/* Background Layer - Blurred image fills entire container */}
                    <img
                      src={imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 z-0"
                    />
                    
                    {/* Foreground Layer - Sharp image centered and contained */}
                    <img
                      src={imageUrl}
                      alt={`${business.name} - imagen ${index + 1}`}
                      className="relative z-10 h-full w-auto mx-auto object-contain"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            /* Static banner for premium businesses without multiple images */
            <>
              <img
                src={
                  business.coverUrl ||
                  business.image1 ||
                  (business.plan && business.plan !== 'free'
                    ? '/images/default-premium-cover.svg'
                    : 'https://via.placeholder.com/800x400?text=Sin+portada')
                }
                alt={`Portada de ${business.name}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay para Sponsor: Gradiente sutil para mejorar contraste */}
              {plan === 'sponsor' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              )}
            </>
          )}

          {/* Badge de Plan (Flotante en la portada) - Always on top with high z-index */}
          <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl ${currentTheme.badge} border z-40 pointer-events-none`}>
            {plan === 'sponsor' ? '👑 PATROCINADO' : '✨ DESTACADO'}
          </div>
        </div>
      )}

      {/* CONTENT SECTION - Padded business info */}
      <div className="px-4 py-6 space-y-6">
        {/* HEADER CONTENT - Información Principal */}
        <section className={`relative rounded-2xl overflow-hidden ${currentTheme.wrapper} ${
          plan === 'sponsor' || plan === 'featured'
            ? 'shadow-xl' 
            : 'shadow-sm'
        }`}>
        {/* Efecto de brillo para premium */}
        {(plan === 'sponsor' || plan === 'featured') && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none" />
        )}

        <div className="px-4 py-4 relative z-10">
          {/* Compact Header - Logo inline with Business Name */}
          <div className="flex items-start gap-3 mb-4">
            {/* Logo inline (avatar style) - SOLO para planes premium */}
            {plan !== 'free' && (
              <div className="flex-shrink-0">
                <img 
                  src={
                    business.logoUrl ||
                    business.image1 ||
                    '/images/default-premium-logo.svg'
                  } 
                  alt={`Logo de ${business.name}`}
                  className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white"
                />
              </div>
            )}

            {/* Business Name and Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{business.name}</h1>
                {/* Icono de Verificado para premium */}
                {plan !== 'free' && (
                  <span className="text-blue-500 text-lg" title="Negocio Verificado">✓</span>
                )}
              </div>

              {/* Categoría y Rango de Precio */}
              <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">{business.category && (
                <span className="bg-gray-100 px-3 py-1 rounded-full font-medium">{business.category}</span>
              )}
              {business.colonia && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>
              )}
              
              {/* NUEVO: Rango de Precios */}
              {(business as any).priceRange && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${currentTheme.priceBadge}`}>
                  💰 {(business as any).priceRange}
                </span>
              )}

              {business.hasDelivery && (
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">🚚 Delivery</span>
              )}
            </div>
            </div>
            
            {/* Rating y reseñas */}
            {Number(business.rating ?? 0) > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(Number(business.rating ?? 0))
                          ? 'text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-bold text-gray-900">{Number(business.rating ?? 0).toFixed(1)}</span>
                  {(business as any).reviewCount > 0 && (
                    <span className="text-gray-600 ml-1">
                      ({(business as any).reviewCount} {(business as any).reviewCount === 1 ? 'reseña' : 'reseñas'})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS (Botones de llamada a la acción con temas) */}
          <div className="flex flex-wrap gap-3 mt-6">
            {/* Botón WhatsApp - Siempre verde */}
            {whatsappHref && whatsappHref !== '#' && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] shadow-sm transition-all"
                aria-label={`Enviar mensaje por WhatsApp a ${business.name}`}
                onClick={() => trackDetailCTA('whatsapp')}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            
            {/* Botón Llamar - Azul sólido consistente para todos los planes */}
            {callHref && callHref !== '' && (
              <a
                href={callHref}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                aria-label={`Llamar a ${business.name}`}
                onClick={() => trackDetailCTA('call')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Llamar
              </a>
            )}

            {/* Botón Cómo llegar - Estilo outline secundario */}
            {hasMapLink && (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 bg-transparent transition-all"
                aria-label={`Como llegar a ${business.name}`}
                onClick={handleMapClick}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Mapa
              </a>
            )}
          </div>

          {/* Botones adicionales en fila separada */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {facebookHref && (
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
                aria-label={`Abrir Facebook de ${business.name}`}
                onClick={() => trackDetailCTA('facebook')}
              >
                <FacebookIcon className="w-4 h-4" /> Facebook
              </a>
            )}
            {canManage && (
              <a
                href={dashboardHref}
                className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition"
                aria-label="Gestionar negocio"
                onClick={() => trackDetailInteraction('dashboard_viewed')}
              >
                Gestionar
              </a>
            )}
            
            {/* Botón de reportar */}
            {!canManage && (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition col-span-2"
                aria-label="Reportar problema con este negocio"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                Reportar
              </button>
            )}
          </div>

          {/* Información adicional (dirección, horarios, precio) */}
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            {business.address && (
              <p>
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
              <p>
                <strong>Precio:</strong> {business.price}
              </p>
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



      {/* Descripcion */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripción</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {business.description || "Sin descripcion disponible."}
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
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
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
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
    </>
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
