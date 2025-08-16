import React from "react";
import ShareButton from "./ShareButton";

export default function BusinessModal({ business, onClose, onFavorite, isFavorite }: any) {
  // Depuración: mostrar el valor real recibido
  React.useEffect(() => {
    console.log('business.images:', business.images);
  }, [business]);
  if (!business) return null;

  // Carrusel de imágenes usando columnas separadas
  const images = [business.image1, business.image2, business.image3].filter(Boolean);
  const [imgIdx, setImgIdx] = React.useState(0);

  const prevImg = () => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImg = () => setImgIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full relative animate-fadeIn">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          title="Cerrar"
        >
          ×
        </button>
        <div className="mb-6 flex flex-col items-center">
          {images.length > 0 ? (
            <>
              <div className="relative w-full h-56 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={images[imgIdx]}
                  alt={`Imagen ${imgIdx + 1}`}
                  className="object-contain w-full h-full transition-all duration-300"
                />
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
                      onClick={prevImg}
                      title="Anterior"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
                      onClick={nextImg}
                      title="Siguiente"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={`w-2 h-2 rounded-full ${i === imgIdx ? "bg-blue-500" : "bg-gray-300"}`}
                    onClick={() => setImgIdx(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-56 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
              No se detectaron imágenes válidas para este negocio.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{business.name}</h2>
          {business.featured === "si" && (
            <span className="inline-block bg-yellow-300 text-yellow-900 px-2 py-1 rounded text-xs font-bold">Destacado</span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mb-2 items-center">
          <span className="text-sm text-gray-500 font-semibold">{business.category}</span>
          <span className={`text-xs px-2 py-1 rounded font-semibold ${business.isOpen === "si" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {business.isOpen === "si" ? "Abierto" : "Cerrado"}
          </span>
        </div>
        <p className="text-gray-700 mb-4 whitespace-pre-line">{business.description}</p>
        <div className="mb-4">
          <div className="flex gap-2 mb-1">
            <span className="font-semibold text-gray-600 w-24">Dirección:</span>
            <span className="text-gray-800">{business.address}</span>
          </div>
          <div className="flex gap-2 mb-1">
            <span className="font-semibold text-gray-600 w-24">Horario:</span>
            <span className="text-gray-800">{business.hours}</span>
          </div>
          <div className="flex gap-2 mb-1 items-center">
            <span className="font-semibold text-gray-600 w-24">Calificación:</span>
            <span className="text-yellow-500 font-bold">{business.rating}</span>
            <span className="text-yellow-500">⭐</span>
          </div>
        </div>
        <div className="flex flex-row gap-2 items-center justify-end mt-2">
          <button
            className={`px-3 py-2 rounded-full text-lg font-bold shadow focus:outline-none ${isFavorite ? "bg-yellow-100 text-yellow-400" : "bg-gray-100 text-gray-300"}`}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => onFavorite && onFavorite(business.id)}
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <a
            href={`tel:${business.phone}`}
            className="px-3 py-2 bg-blue-500 text-white rounded-full text-lg font-bold hover:bg-blue-600 shadow-sm flex items-center justify-center"
            title="Llamar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 8.5C2 6.015 4.015 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 7h8M8 11h8m-8 4h4" />
            </svg>
          </a>
          <a
            href={`https://wa.me/${business.WhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-green-500 text-white rounded-full text-lg font-bold hover:bg-green-600 shadow-sm flex items-center justify-center"
            title="WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
              <path d="M16 3C9.373 3 4 8.373 4 15c0 2.637.77 5.13 2.23 7.29L4 29l7.02-2.18A12.94 12.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.98 0-3.89-.52-5.56-1.51l-.39-.23-4.17 1.29 1.29-4.06-.25-.41A9.98 9.98 0 0 1 6 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.13-7.47c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.54-.45-.47-.61-.48-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.36-.26.29-1 1-.97 2.43.03 1.43.98 2.81 1.12 3 .14.19 2.09 3.2 5.08 4.36.71.24 1.26.38 1.69.49.71.18 1.36.16 1.87.1.57-.07 1.75-.72 2-1.41.25-.69.25-1.28.18-1.41-.07-.13-.25-.2-.53-.34z" />
            </svg>
          </a>
          <a
            href={business.Facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-blue-600 text-white rounded-full text-lg font-bold hover:bg-blue-700 shadow-sm flex items-center justify-center"
            title="Facebook"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788c1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.726 0 1.326-.6 1.326-1.326V1.326C24 .6 23.4 0 22.675 0"/>
            </svg>
          </a>
          <ShareButton business={business} />
        </div>
      </div>
    </div>
  );
}
