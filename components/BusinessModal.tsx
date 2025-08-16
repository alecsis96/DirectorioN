import React from "react";
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
        className="bg-white rounded-2xl shadow-2xl p-0 max-w-lg w-full relative animate-fadeIn border border-gray-200 overflow-hidden"
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
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          title="Cerrar"
        >
          ×
        </button>
        {/* Galería de imágenes */}
        <div className="mb-0 flex flex-col items-center bg-gray-50 px-8 pt-4 pb-6 border-b border-gray-100">
          <style>{responsiveGalleryStyle}</style>
          <div className="mb-2 flex justify-center items-center">
            {images.length > 0 ? (
              <div style={galleryStyles} className="custom-image-gallery rounded-xl overflow-hidden shadow-lg border border-gray-200">
                <ImageGallery
                  items={images}
                  showPlayButton={false}
                  showFullscreenButton={true}
                  showThumbnails={true}
                  useBrowserFullscreen={true}
                  showNav={true}
                  slideOnThumbnailOver={true}
                  additionalClass="rounded-xl"
                />
              </div>
            ) : (
              <p className="text-gray-400 italic">No se detectaron imágenes válidas para este negocio.</p>
            )}
          </div>
        </div>
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
