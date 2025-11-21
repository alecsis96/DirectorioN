import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaPhoneAlt, FaWhatsapp, FaFacebookF, FaHeart, FaRegHeart, FaStar } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import ShareButton from "./ShareButton";
import Link from "next/link";
import { Business } from "../types/business";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";

type Props = {
  business: Business;
  onClose: () => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
};

export default function BusinessModal({ business, onClose, onFavorite, isFavorite }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Accesibilidad: foco, Escape, bloqueo de scroll
  useEffect(() => {
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Imágenes para la galería
  const images = useMemo(() => {
    const cloud = (business as any)?.images as { url: string }[] | undefined;
    const urls: string[] = [];
    if (cloud?.length) urls.push(...cloud.map((i) => i.url).filter(Boolean));
    [business.image1, business.image2, business.image3].forEach((u) => { if (u) urls.push(u as string); });
    const unique = Array.from(new Set(urls));
    return unique.map((u) => ({ original: u, thumbnail: u }));
  }, [business]);

  // Estado de reseñas
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.displayName) setReviewName(user.displayName);
    else setReviewName("");
  }, [user]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "resenas"), where("businessId", "==", business.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    // Bloquea reseñas del dueño sobre su propio negocio
    if (user && (business as any)?.ownerId && user.uid === (business as any).ownerId) {
      setErrorMsg("No puedes dejar reseña en tu propio negocio.");
      return;
    }
    if (!user) {
      setErrorMsg("Debes iniciar sesión para dejar una reseña.");
      return;
    }
    if (!business?.id) {
      setErrorMsg("Negocio no válido.");
      return;
    }
    if (!reviewName.trim() || !reviewText.trim()) {
      setErrorMsg("Por favor, escribe tu nombre y una reseña.");
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
    if (spamWords.some((w) => reviewText.toLowerCase().includes(w))) {
      setErrorMsg("Tu reseña contiene palabras no permitidas.");
      return;
    }
    if (userReviewId) {
      await updateDoc(doc(db, "resenas", userReviewId), {
        name: reviewName,
        text: reviewText,
        rating: reviewRating,
      });
    } else {
      await addDoc(collection(db, "resenas"), {
        businessId: business.id,
        name: reviewName,
        text: reviewText,
        rating: reviewRating,
        created: new Date().toISOString(),
        userId: user.uid,
      });
    }
    setReviewText("");
    setReviewRating(5);
  }

  async function handleDelete(reviewId: string) {
    await deleteDoc(doc(db, "resenas", reviewId));
  }

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/80 flex items-start md:items-center justify-center z-50 backdrop-blur-sm overflow-y-auto py-4 md:py-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-0 max-w-4xl w-full relative animate-fadeIn border border-gray-200 overflow-hidden my-auto"
        style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto", overscrollBehavior: "contain" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky para que el botón X siempre sea visible */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 md:px-8 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white shadow-sm">
          <h2 id="business-modal-title" className="text-xl md:text-2xl font-extrabold text-gray-800 tracking-tight pr-4 truncate">
            {business.name}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-700 text-3xl md:text-2xl font-bold transition-colors duration-150 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
            ref={closeBtnRef}
          >
            <IoClose />
          </button>
        </div>

        {/* Two columns */}
        <div className="w-full px-4 py-6">
          <div className="flex flex-col md:flex-row gap-0 md:gap-8">
            {/* Left: gallery */}
            <div className="md:w-5/12 w-full flex flex-col items-center justify-center mb-6 md:mb-0 md:pr-4">
              {images.length > 0 ? (
                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 w-full">
                  <ImageGallery
                    items={images}
                    showPlayButton={false}
                    showFullscreenButton={true}
                    showThumbnails={false}
                    showBullets={true}
                    useBrowserFullscreen={false}
                    showNav={true}
                    slideOnThumbnailOver={true}
                    additionalClass="rounded-xl"
                  />
                </div>
              ) : (
                <p className="text-gray-400 italic w-full text-center">No se detectaron imágenes para este negocio.</p>
              )}
            </div>

            {/* Right: info + reviews */}
            <div className="md:w-7/12 w-full flex flex-col justify-start">
              {/* Info */}
              <div className="px-8 pt-6 pb-2">
                <div className="flex flex-wrap gap-4 mb-2 items-center">
                  <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded shadow">{business.category}</span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold shadow ${business.isOpen === "si" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {business.isOpen === "si" ? "Abierto" : "Cerrado"}
                  </span>
                </div>
                <p className="text-gray-700 mb-4 whitespace-pre-line text-base leading-relaxed tracking-tight">{business.description}</p>
                <div className="mb-4 grid grid-cols-1 gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-24">Dirección:</span>
                    <span className="text-gray-800">{business.address}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-24">Horario:</span>
                    <span className="text-gray-800">{business.hours}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-24">Calificación:</span>
                    <span className="text-yellow-600 font-bold">{Number.isFinite(Number(business.rating)) ? business.rating : 0}</span>
                    <span className="flex items-center gap-0.5 text-yellow-500" aria-hidden>
                      {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(business.rating) || 0))) }).map((_, i) => (
                        <FaStar key={i} />
                      ))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-8 pb-6 pt-2 gap-4">
                <div className="flex items-center">
                  {user?.uid && (business as any)?.ownerId && user.uid === (business as any).ownerId && business.id && (
                    <Link href={`/dashboard/${business.id}`} className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 whitespace-nowrap">
                      Editar este negocio
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3">
                <button
                  className={`px-3 py-2 rounded-full text-lg font-bold shadow focus:outline-none transition-colors duration-150 border border-yellow-200 ${isFavorite ? "bg-yellow-100 text-yellow-400" : "bg-gray-100 text-gray-300 hover:bg-yellow-50 hover:text-yellow-400"}`}
                  title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                  onClick={() => onFavorite && business.id && onFavorite(business.id)}
                  aria-pressed={!!isFavorite}
                >
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                </button>
                <a
                  href={`tel:${business.phone}`}
                  className="px-3 py-2 bg-blue-500 text-white rounded-full text-lg font-bold hover:bg-blue-600 shadow-sm flex items-center justify-center border border-blue-200 transition-colors duration-150"
                  title="Llamar"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <FaPhoneAlt className="text-xl" />
                  </span>
                </a>
                <a
                  href={`https://wa.me/${business.WhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-green-500 text-white rounded-full text-lg font-bold hover:bg-green-600 shadow-sm flex items-center justify-center border border-green-200 transition-colors duration-150"
                  title="WhatsApp"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <FaWhatsapp className="text-xl" />
                  </span>
                </a>
                <a
                  href={business.Facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-600 text-white rounded-full text-lg font-bold hover:bg-blue-700 shadow-sm flex items-center justify-center border border-blue-300 transition-colors duration-150"
                  title="Facebook"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <FaFacebookF className="text-xl" />
                  </span>
                </a>
                <ShareButton business={business} />
                </div>
              </div>

              {/* Reviews */}
              <div className="px-8 pb-8">
                <h3 className="text-lg font-bold text-[#38761D] mb-3">Reseñas de usuarios</h3>
                {errorMsg && <div className="text-red-500 text-sm mb-2 font-semibold">{errorMsg}</div>}
                {!user ? (
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-4 py-2 rounded font-bold mb-4"
                    onClick={handleSignIn}
                  >
                    Iniciar sesión con Google para dejar una reseña
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="text"
                        value={reviewName}
                        disabled
                        placeholder="Tu nombre"
                        className="border rounded px-3 py-2 flex-1 bg-gray-100 text-gray-500"
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
                    <input
                      type="text"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Escribe tu reseña"
                      className="border rounded px-3 py-2 w-full"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-[#38761D] text-white px-4 py-2 rounded">
                        {userReviewId ? "Guardar cambios" : "Enviar"}
                      </button>
                      <button type="button" className="bg-gray-100 text-gray-700 px-4 py-2 rounded" onClick={() => auth.signOut()}>
                        Cerrar sesión
                      </button>
                    </div>
                  </form>
                )}
                <div className="space-y-3">
                  {reviews.length === 0 && (
                    <div className="text-gray-400 italic">Sé el primero en dejar una reseña.</div>
                  )}
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-gray-50 border rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                          {r.name?.charAt(0) || "?"}
                        </div>
                        <span className="font-semibold text-gray-800">{r.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">{r.created ? new Date(r.created).toLocaleDateString("es-MX") : ""}</span>
                      </div>
                      <div className="text-yellow-500 mb-1 flex gap-0.5" aria-hidden>
                        {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0))) }).map((_, i) => (
                          <FaStar key={i} />
                        ))}
                      </div>
                      <div className="text-gray-700">{r.text}</div>
                      {user?.uid && r.userId === user.uid && (
                        <div className="mt-2 flex gap-2">
                          <button
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-xs"
                            onClick={() => {
                              setReviewText(r.text);
                              setReviewRating(r.rating);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                            onClick={() => handleDelete(r.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
