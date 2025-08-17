import React from "react";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { auth, googleProvider } from "../firebaseConfig";
import { collection, query, where, addDoc, onSnapshot } from "firebase/firestore";
import ShareButton from "./ShareButton";
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";

const galleryStyles: React.CSSProperties = {
  maxWidth: '100%',
  width: '400px',
  height: 'auto',
  margin: '0 auto',
};

// Estilos responsivos para el carrusel
const responsiveGalleryStyle = `
  @media (max-width: 600px) {
    .custom-image-gallery {
      width: 95vw !important;
      min-width: 0 !important;
      max-width: 100vw !important;
      height: auto !important;
    }
    .image-gallery-slide img {
      max-height: 250px !important;
      object-fit: contain !important;
    }
    .image-gallery-thumbnails-wrapper {
      display: none !important;
    }
  }
`;

export default function BusinessModal({ business, onClose, onFavorite, isFavorite }: any) {
  const [userReview, setUserReview] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => setUser(u));
    return () => unsubscribe();
  }, []);
  const [errorMsg, setErrorMsg] = useState("");
  // Reseñas de Firebase
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");

  // Actualizar el nombre del usuario autenticado automáticamente
  useEffect(() => {
    if (user && user.displayName) {
      setReviewName(user.displayName);
    } else {
      setReviewName("");
    }
  }, [user]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "resenas"), where("businessId", "==", business.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const allReviews = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          text: data.text,
          rating: data.rating,
          created: data.created,
          userId: data.userId,
        };
      });
      setReviews(allReviews);
      if (user && user.uid) {
        const found = allReviews.find(r => r.userId === user.uid);
        setUserReview(found || null);
      } else {
        setUserReview(null);
      }
    });
    return () => unsub();
  }, [business?.id]);

  const handleReviewSubmit = async (e: any) => {
    e.preventDefault();
    // Validaciones
    if (!user) {
      setErrorMsg("Debes iniciar sesión para dejar una reseña.");
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
    if (!business?.id) {
      setErrorMsg("Negocio no válido.");
      return;
    }
    // Opcional: filtro simple de spam
    const spamWords = ["http://", "https://", "www.", "spam", "oferta", "dinero", "gratis"];
    if (spamWords.some(w => reviewText.toLowerCase().includes(w))) {
      setErrorMsg("Tu reseña contiene palabras no permitidas.");
      return;
    }
    if (userReview && !editMode) {
      setErrorMsg("Solo puedes dejar una reseña por negocio. Puedes editar o eliminar tu reseña existente.");
      return;
    }
    const reviewData = {
      businessId: business.id,
      name: reviewName,
      text: reviewText,
      rating: reviewRating,
      created: new Date().toISOString(),
      userId: user.uid
    };
    if (editMode && userReview) {
      // Editar reseña existente
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "resenas", userReview.id), reviewData);
      setEditMode(false);
    } else {
      await addDoc(collection(db, "resenas"), reviewData);
    }
    setReviewText("");
    setReviewRating(5);
    setErrorMsg("");
  };
  // Depuración: mostrar el valor real recibido
  React.useEffect(() => {
    console.log('business.images:', business.images);
  }, [business]);
  if (!business) return null;

  // Construye el array de imágenes para la galería
  const images = [business.image1, business.image2, business.image3]
    .filter(Boolean)
    .map(url => ({
      original: url,
      thumbnail: url,
      originalClass: "custom-image", // puedes personalizar el estilo
    }));

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-0 max-w-4xl w-full relative animate-fadeIn border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado con botón de cerrar */}
        <div className="flex items-center justify-between px-8 pt-6 pb-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            {business.name}
            {business.featured === "si" && (
              <span className="inline-block bg-yellow-300 text-yellow-900 px-2 py-1 rounded text-xs font-bold ml-2 shadow">Destacado</span>
            )}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-700 text-2xl font-bold transition-colors duration-150"
            onClick={onClose}
            title="Cerrar"
          >
            ×
          </button>
        </div>
        {/* Layout de dos columnas en escritorio */}
        <div className="w-full px-4 py-6">
          <div className="flex flex-col md:flex-row gap-0 md:gap-8">
            {/* Carrusel de imágenes a la izquierda */}
            <div className="md:w-5/12 w-full flex flex-col items-center justify-center mb-6 md:mb-0 md:pr-4">
              <style>{responsiveGalleryStyle}</style>
              {images.length > 0 ? (
                <div style={galleryStyles} className="custom-image-gallery rounded-xl overflow-hidden shadow-lg border border-gray-200 w-full">
                  <ImageGallery
                    items={images}
                    showPlayButton={false}
                    showFullscreenButton={true}
                    showThumbnails={true}
                    useBrowserFullscreen={false}
                    showNav={true}
                    slideOnThumbnailOver={true}
                    additionalClass="rounded-xl"
                  />
                  <style>{`
                    @media (max-width: 600px) {
                      .image-gallery-fullscreen .image-gallery-slide img {
                        max-width: 100vw !important;
                        max-height: 100vh !important;
                        object-fit: contain !important;
                        margin: 0 auto !important;
                        background: #000 !important;
                      }
                      .image-gallery-fullscreen {
                        background: #000 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                      }
                    }
                  `}</style>
                </div>
              ) : (
                <p className="text-gray-400 italic w-full text-center">No se detectaron imágenes válidas para este negocio.</p>
              )}
            </div>
            {/* Info y reseñas a la derecha */}
            <div className="md:w-7/12 w-full flex flex-col justify-start ">
              {/* Info principal */}
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
                    <span className="text-yellow-500 font-bold">{business.rating}</span>
                    <span className="text-yellow-500">⭐</span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
        {/* Reseñas de usuarios */}
              <div className="px-4 pb-4">
                <h3 className="text-lg font-bold text-[#38761D] mb-2">Reseñas de usuarios</h3>
                <form onSubmit={handleReviewSubmit} className="flex flex-col md:flex-row gap-2 mb-4">
                  {errorMsg && (
                    <div className="text-red-500 text-sm mb-2 font-semibold">{errorMsg}</div>
                  )}
                  {!user && (
                    <button
                      type="button"
                      className="bg-blue-500 text-white px-4 py-2 rounded font-bold mb-2"
                      onClick={async () => {
                        try {
                          // Usar el método correcto del SDK
                          const { signInWithPopup } = await import("firebase/auth");
                          await signInWithPopup(auth, googleProvider);
                        } catch (err) {
                          setErrorMsg("Error al iniciar sesión");
                        }
                      }}
                    >
                      Iniciar sesión con Google para dejar una reseña
                    </button>
                  )}
                  {user && (
                    <>
                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex flex-col gap-2 w-full md:flex-row md:gap-2">
                          <input type="text" value={reviewName} disabled placeholder="Tu nombre" className="border rounded px-3 py-2 flex-1 bg-gray-100 text-gray-500 text-base" />
                          <input type="number" min={1} max={5} value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="border rounded px-3 py-2 w-full md:w-16 text-base" />
                          <input type="text" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Escribe tu reseña" className="border rounded px-3 py-2 flex-1 text-base" />
                        </div>
                        <div className="flex flex-col gap-2 w-full mt-2 md:flex-row md:gap-2">
                          <button
                            type="submit"
                            className="bg-[#38761D]/80 text-white px-1 py-1 rounded-md w-full font-normal shadow-sm text-sm hover:bg-[#38761D] transition-all duration-150"
                          >{editMode ? "Guardar cambios" : "Enviar"}</button>
                          <button
                            type="button"
                            className="bg-gray-100 text-gray-500 px-1 py-1 rounded-md w-full font-normal shadow-sm text-sm hover:bg-gray-200 transition-all duration-150"
                            onClick={async () => { await auth.signOut(); }}
                          >Cerrar sesión</button>
                        </div>
                      </div>
                    </>
                  )}
                </form>
                <div className="space-y-2">
                  {reviews.length === 0 && (
                    <div className="text-gray-400 italic">Sé el primero en dejar una reseña.</div>
                  )}
                  {reviews.map((r: any, idx: number) => (
                    <div key={idx} className="bg-gradient-to-br from-green-50 via-white to-gray-50 border border-green-200 rounded-2xl p-5 shadow-md mb-4 flex flex-col">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-lg">
                          {r.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-base">{r.name}</span>
                          <span className="text-xs text-gray-500">{r.created ? new Date(r.created).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
                        </div>
                        <div className="flex items-center ml-auto gap-1">
                          {[...Array(r.rating)].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-lg">★</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-gray-700 mb-2 text-base leading-relaxed">{r.text}</span>
                      {user && r.userId === user.uid && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <button
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded shadow text-xs font-bold border border-yellow-500 transition-all duration-150 flex items-center gap-1"
                            onClick={() => {
                              setReviewText(r.text);
                              setReviewRating(r.rating);
                              setEditMode(true);
                            }}
                          ><span>✏️</span> Editar</button>
                          <button
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow text-xs font-bold border border-red-600 transition-all duration-150 flex items-center gap-1"
                            onClick={async () => {
                              const { deleteDoc, doc } = await import("firebase/firestore");
                              await deleteDoc(doc(db, "resenas", r.id));
                              setEditMode(false);
                              setReviewText("");
                              setReviewRating(5);
                              setErrorMsg("");
                            }}
                          ><span>🗑️</span> Eliminar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

        {/* Botones de acción */}
        <div className="flex flex-row gap-3 items-center justify-end px-8 pb-6 pt-2 border-t border-gray-100 bg-gradient-to-r from-white to-gray-50">
          <button
            className={`px-3 py-2 rounded-full text-lg font-bold shadow focus:outline-none transition-colors duration-150 border border-yellow-200 ${isFavorite ? "bg-yellow-100 text-yellow-400" : "bg-gray-100 text-gray-300 hover:bg-yellow-50 hover:text-yellow-400"}`}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => onFavorite && onFavorite(business.id)}
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <a
            href={`tel:${business.phone}`}
            className="px-3 py-2 bg-blue-500 text-white rounded-full text-lg font-bold hover:bg-blue-600 shadow-sm flex items-center justify-center border border-blue-200 transition-colors duration-150"
            title="Llamar"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {/* Teléfono */}
              <i className="text-xl">
                {require('react-icons/fa').FaPhoneAlt()}
              </i>
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
              {/* WhatsApp */}
              <i className="text-xl">
                {require('react-icons/fa').FaWhatsapp()}
              </i>
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
              {/* Facebook */}
              <i className="text-xl">
                {require('react-icons/fa').FaFacebookF()}
              </i>
            </span>
          </a>
          <ShareButton business={business} />
        </div>
      </div>
    </div>
  );
}
