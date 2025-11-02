
// components/BusinessDetailView.tsx
import { onAuthStateChanged } from "firebase/auth";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { FaPhoneAlt, FaWhatsapp, FaFacebookF, FaStar } from "react-icons/fa";
import ShareButton from "./ShareButton";
import type { Business } from "../types/business";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  where,
  getDocs,
  serverTimestamp,
  query as fsQuery,
} from "firebase/firestore";
import { waLink, mapsLink, normalizeDigits } from "../lib/helpers/contact";
import { upsertReview, reviewsQuery, ReviewSchema } from "../lib/firestore/reviews";

// Carga dinámica para evitar problemas de SSR con react-image-gallery
const ImageGallery = dynamic(() => import("react-image-gallery"), { 
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

interface Props {
  business: Business;
}

export default function BusinessDetailView({ business }: Props) {

  
  // ---------- Galería ----------
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
          <div className="relative w-full overflow-hidden rounded-xl bg-gray-100 aspect-[3/4] flex items-center justify-center text-gray-400">
            <span>Sin imagen</span>
          </div>
        );
      }
      return (
        <div className="relative w-full overflow-hidden rounded-xl bg-gray-100 aspect-[3/4]">
          <img
            src={src}
            alt={altText}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      );
    },
    [business.name]
  );

  // ---------- Usuario / Reseñas ----------
  const [user, setUser] = useState<null | { uid: string; displayName?: string | null; email?: string | null }>(
    () => auth.currentUser as any
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

// Normaliza correos
const ownerEmail = (business.ownerEmail || "").toLowerCase();
const userEmail  = (user?.email || "").toLowerCase();

// Dueño por uid o por correo; o admin
const isOwnerByUid   = Boolean(user?.uid && business.ownerId && user.uid === business.ownerId);
const isOwnerByEmail = Boolean(userEmail && ownerEmail && userEmail === ownerEmail);
const canManage      = (isOwnerByUid || isOwnerByEmail || isAdmin) && !!business.id;

const dashboardHref = business.id ? `/dashboard/${business.id}` : "/dashboard";


 useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (u) => {
    setUser(u as any);
    if (u) {
      try {
        const tr = await u.getIdTokenResult();
        setIsAdmin(tr.claims?.admin === true);
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
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Calificación ${n}`}
            onClick={() => onChange(n)}
            className={active ? "text-yellow-500" : "text-gray-300"}
            title={`${n} estrellas`}
          >
            <FaStar />
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

    if (!business?.id) return setErrorMsg("Negocio no válido.");
    if (!user) return setErrorMsg("Debes iniciar sesión para dejar una reseña.");
    if (isOwnerByUid || isOwnerByEmail) return setErrorMsg("No puedes dejar reseña en tu propio negocio.");

    const text = cleanText(reviewText);
    const payload = {
      name: (reviewName || "").trim(),
      text,
      rating: reviewRating,
    };

    const parsed = ReviewSchema.safeParse(payload);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Datos inválidos.";
      return setErrorMsg(msg);
    }

    setBusy(true);
    try {
      await upsertReview(db, business.id!, user.uid, parsed.data);
      setReviewText("");
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Hubo un problema al guardar tu reseña.");
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
      setErrorMsg("No pudimos eliminar tu reseña.");
    } finally {
      setBusy(false);
    }
  }

  // -------- Contacto / Mapas ----------
  const tel = normalizeDigits(business.phone);
  const wa = waLink(business.WhatsApp);
  const mapHref = mapsLink(business.lat, business.lng, business.address);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const embedSrc =
    googleKey && business.lat != null && business.lng != null
      ? `https://www.google.com/maps/embed/v1/view?key=${googleKey}&center=${business.lat},${business.lng}&zoom=16`
      : null;

  // -------- JSON-LD (SEO Local) ----------
  const ldLocalBusiness = useMemo(() => {
    const images = galleryItems.map((i) => i.original).slice(0, 3);
    const ratingNumber = Number(business.rating || 0);
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: business.name,
      address: business.address,
      telephone: tel || undefined,
      image: images.length ? images : undefined,
      priceRange: business.price || "MXN",
      url: typeof window !== "undefined" ? window.location.href : undefined,
      aggregateRating:
        ratingNumber > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: ratingNumber.toFixed(1),
              reviewCount: Math.max(1, reviews.length || 0),
            }
          : undefined,
    };
  }, [business, galleryItems, reviews.length, tel]);

  const open = business.isOpen === "si";

  return (
    <div className="space-y-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness) }}
      />

      {/* Header */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
            <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">
              {business.category && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{business.category}</span>
              )}
              {business.colonia && (
                <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  open ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
                aria-live="polite"
              >
                {open ? "Abierto" : "Cerrado"}
              </span>
              <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                <FaStar />
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
                >
                  {business.address}
                </a>
              </p>
            )}
            {business.hours && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Horario:</strong> {business.hours}
              </p>
            )}
            {business.price && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Precio:</strong> {business.price}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full md:w-52">
            <button
              type="button"
              disabled={!tel}
              onClick={() => tel && (window.location.href = `tel:${tel}`)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
              aria-disabled={!tel}
              aria-label="Llamar por teléfono"
            >
              <FaPhoneAlt /> Llamar
            </button>

            <a
              href={wa || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50"
              aria-disabled={!wa}
              aria-label="Abrir WhatsApp"
            >
              <FaWhatsapp /> WhatsApp
            </a>

            {business.Facebook && (
              <a
                href={business.Facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
                aria-label="Abrir Facebook"
              >
                <FaFacebookF /> Facebook
              </a>
            )}

           {/* <ShareButton business={business} /> */}

            {canManage && (
  <a
    href={dashboardHref}
    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition"
  >
    Gestionar negocio
  </a>
)}

          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Galería</h2>
        {galleryItems.length ? (
          <div className="relative max-w-lg mx-auto">
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
        ) : (
          <p className="text-sm text-gray-500">Este negocio aún no tiene imágenes.</p>
        )}
      </section>

      {/* Descripción */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripción</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {business.description || "Sin descripción disponible."}
        </p>
      </section>

      {/* Mapa */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mapa</h2>
        {embedSrc ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border">
            <iframe
              title={`Mapa de ${business.name}`}
              src={embedSrc}
              width="100%"
              height="100%"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            <p className="mb-2">
              Para ver un mapa incrustado agrega la variable NEXT_PUBLIC_GOOGLE_MAPS_KEY (restringida por dominio).
            </p>
            <a className="text-[#38761D] underline" href={mapHref} target="_blank" rel="noopener noreferrer">
              Abrir ubicación en Google Maps
            </a>
          </div>
        )}
      </section>

      {/* Reseñas */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reseñas de clientes</h2>
        {errorMsg && <div className="text-sm text-red-500 font-semibold mb-3">{errorMsg}</div>}

        {!user ? (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            onClick={handleSignIn}
          >
            Iniciar sesión con Google para dejar una reseña
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
                {userReviewId ? "Guardar cambios" : "Enviar reseña"}
              </button>
              {userReviewId && (
                <button
                  type="button"
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50"
                  onClick={handleDeleteMyReview}
                  disabled={busy}
                >
                  Borrar mi reseña
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"
                onClick={() => auth.signOut()}
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-gray-500">Aún no hay reseñas. Sé el primero en compartir tu opinión.</p>
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
                  <span className="ml-auto text-yellow-500 flex items-center gap-1" aria-label={`Calificación ${stars}`}>
                    {Array.from({ length: stars }).map((_, idx) => (
                      <FaStar key={idx} />
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
