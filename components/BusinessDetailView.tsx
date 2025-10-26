
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ImageGallery, { ReactImageGalleryItem } from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { FaPhoneAlt, FaWhatsapp, FaFacebookF, FaStar } from "react-icons/fa";
import ShareButton from "./ShareButton";
import { Business } from "../types/business";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

interface Props {
  business: Business;
}

export default function BusinessDetailView({ business }: Props) {
  const galleryItems = useMemo<ReactImageGalleryItem[]>(() => {
    const urls: string[] = [];
    const cloud = (business as any)?.images as { url?: string | null }[] | undefined;
    if (cloud?.length) {
      urls.push(
        ...cloud
          .map((item) => (typeof item?.url === "string" ? item.url.trim() : ""))
          .filter(Boolean)
      );
    }
    [business.image1, business.image2, business.image3].forEach((url) => {
      if (typeof url === "string" && url.trim().length) urls.push(url.trim());
    });
    const unique = Array.from(new Set(urls));
    return unique.slice(0, 12).map((url) => ({ original: url, thumbnail: url }));
  }, [business]);

  const renderItem = useCallback((item: ReactImageGalleryItem) => {
    const src = typeof item?.original === "string" ? item.original : "";
    const altText = business.name ? business.name + " imagen" : "Imagen del negocio";
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
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }, [business.name]);

  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const isOwner = Boolean(user?.uid && business.ownerId && business.ownerId === user?.uid);
  const dashboardHref = business.id ? `/dashboard/${business.id}` : "/dashboard";

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((nextUser) => setUser(nextUser));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.displayName) setReviewName(user.displayName);
    else if (user?.email) setReviewName(user.email.split("@")[0]);
    else setReviewName("");
  }, [user]);

  useEffect(() => {
    if (!business?.id) return;
    const reviewsQuery = query(collection(db, "resenas"), where("businessId", "==", business.id));
    const unsub = onSnapshot(reviewsQuery, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(list);
      if (user?.uid) {
        const own = list.find((r: any) => r.userId === user.uid);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    if (!business?.id) {
      setErrorMsg("Negocio no válido.");
      return;
    }
    if (user && (business as any)?.ownerId && user.uid === (business as any).ownerId) {
      setErrorMsg("No puedes dejar reseña en tu propio negocio.");
      return;
    }
    if (!user) {
      setErrorMsg("Debes iniciar sesión para dejar una reseña.");
      return;
    }
    if (!reviewName.trim() || !reviewText.trim()) {
      setErrorMsg("Completa tu nombre y la reseña.");
      return;
    }
    if (reviewText.length < 10) {
      setErrorMsg("La reseña debe tener al menos 10 caracteres.");
      return;
    }
    if (reviewText.length > 300) {
      setErrorMsg("La reseña no puede superar los 300 caracteres.");
      return;
    }
    const spamWords = ["http://", "https://", "www.", "spam", "oferta", "dinero", "gratis"];
    if (spamWords.some((word) => reviewText.toLowerCase().includes(word))) {
      setErrorMsg("Tu reseña contiene palabras no permitidas.");
      return;
    }
    setBusy(true);
    try {
      if (userReviewId) {
        await updateDoc(doc(db, "resenas", userReviewId), {
          name: reviewName,
          text: reviewText,
          rating: reviewRating,
          updated: Date.now(),
        });
      } else {
        await addDoc(collection(db, "resenas"), {
          businessId: business.id,
          name: reviewName,
          text: reviewText,
          rating: reviewRating,
          created: Date.now(),
          userId: user.uid,
        });
      }
      setReviewText("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Hubo un problema al guardar tu reseña.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(reviewId: string) {
    if (!reviewId) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "resenas", reviewId));
    } catch (err) {
      console.error(err);
      setErrorMsg("No pudimos eliminar la reseña.");
    } finally {
      setBusy(false);
    }
  }

  const mapsHref = business.lat != null && business.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`
    : "https://www.google.com/maps/search/?api=1&query=";

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const embedSrc = googleKey && business.lat != null && business.lng != null
    ? `https://www.google.com/maps/embed/v1/view?key=${googleKey}&center=${business.lat},${business.lng}&zoom=16`
    : null;

  return (
    <div className="space-y-10">
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
            <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">
              {business.category && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.category}</span>}
              {business.colonia && <span className="bg-gray-100 px-3 py-1 rounded-full">{business.colonia}</span>}
              <span className="px-3 py-1 rounded-full text-xs font-semibold">
                {business.isOpen === "si" ? "Abierto" : "Cerrado"}
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
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38761D] hover:underline"
                >
                  {business.address}
                </a>
              </p>
            )}
            {business.hours && (
              <p className="text-sm text-gray-600 mb-1"><strong>Horario:</strong> {business.hours}</p>
            )}
            {business.price && (
              <p className="text-sm text-gray-600 mb-1"><strong>Precio:</strong> {business.price}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full md:w-52">
            <a
              href={business.phone ? `tel:${business.phone}` : undefined}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40"
            >
              <FaPhoneAlt /> Llamar
            </a>
            <a
              href={business.WhatsApp ? `https://wa.me/${business.WhatsApp}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition disabled:opacity-40"
            >
              <FaWhatsapp /> WhatsApp
            </a>
            {business.Facebook && (
              <a
                href={business.Facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
              >
                <FaFacebookF /> Facebook
              </a>
            )}
            <ShareButton business={business} />
            {isOwner && (
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

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Galeria</h2>
        {galleryItems.length ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-gray-500">Este negocio aun no tiene imagenes.</p>
        )}
      </section>
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripcion</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {business.description || "Sin descripcion disponible."}
        </p>
      </section>

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
            <p className="mb-2">Para ver un mapa incrustado agrega la variable NEXT_PUBLIC_GOOGLE_MAPS_KEY.</p>
            <a className="text-[#38761D] underline" href={mapsHref} target="_blank" rel="noopener noreferrer">
              Abrir ubicación en Google Maps
            </a>
          </div>
        )}
      </section>

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
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={reviewName}
                disabled
                className="border rounded px-3 py-2 flex-1 bg-gray-100 text-gray-600"
                placeholder="Tu nombre"
              />
              <input
                type="number"
                min={1}
                max={5}
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="border rounded px-3 py-2 w-24"
              />
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Comparte tu experiencia"
              className="border rounded px-3 py-2 w-full h-28"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#38761D] text-white rounded-lg font-semibold disabled:opacity-50"
                disabled={busy}
              >
                {userReviewId ? "Guardar cambios" : "Enviar reseña"}
              </button>
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
            <p className="text-sm text-gray-500">Aún no hay reseñas. Sé el primero en compartir tu opinión.</p>
          )}
          {reviews.map((review: any) => (
            <div key={review.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold uppercase">
                  {review.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{review.name}</p>
                  {review.created && (
                    <p className="text-xs text-gray-500">
                      {new Date(review.created).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </div>
                <span className="ml-auto text-yellow-500 flex items-center gap-1">
                  {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))) }).map((_, idx) => (
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
                    onClick={() => handleDelete(review.id)}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

