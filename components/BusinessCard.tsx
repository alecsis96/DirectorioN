import React from "react";
import Image from "next/image";
import ShareButton from "./ShareButton";
import { FaPhoneAlt, FaWhatsapp, FaFacebookF, FaStar } from 'react-icons/fa';
import { Business } from "../types/business";

interface BusinessProps {
  business: Business;
}

const BusinessCard: React.FC<BusinessProps> = ({ business }) => {
  // Vista previa de imagen usando la primera imagen disponible o una genérica
  const genericImage = "https://via.placeholder.com/400x300?text=Sin+imagen";
  const previewImg = (business as any).images?.[0]?.url || business.image1 || business.image2 || business.image3 || genericImage;
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 flex flex-col border border-gray-100 hover:shadow-2xl transition-shadow relative animate-fadeIn">
      <div className="mb-5 w-full h-44 flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-yellow-100 rounded-xl overflow-hidden border border-gray-200 shadow relative">
        <Image
          src={previewImg}
          alt={`${business.name} preview`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">{business.name}</h2>
        {business.featured === "si" && (
          <span className="inline-block bg-yellow-300 text-yellow-900 px-2 py-1 rounded text-xs font-bold shadow">Destacado</span>
        )}
      </div>
      <div className="flex flex-wrap gap-4 mb-2 items-center">
        <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded shadow">{business.category}</span>
        <span className={`text-xs px-2 py-1 rounded font-semibold shadow ${business.isOpen === "si" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {business.isOpen === "si" ? "Abierto" : "Cerrado"}
        </span>
      </div>
      <p className="text-gray-700 mb-4 whitespace-pre-line text-base leading-relaxed tracking-tight">{business.description}</p>
      <div className="mb-4 grid grid-cols-1 gap-2">
        <div className="flex gap-2 items-center">
          <span className="font-bold text-gray-600 w-24 ">Dirección:</span>
          <span className="text-gray-800">{business.address}</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="font-bold text-gray-600 w-24">Horario:</span>
          <span className="text-gray-800">{business.hours}</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="font-bold text-gray-600 w-24">Calificación:</span>
          <span className="text-yellow-600 font-bold">{Number.isFinite(Number(business.rating)) ? business.rating : 0}</span>
          <span className="flex items-center gap-0.5 text-yellow-500" aria-hidden>
            {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(business.rating) || 0))) }).map((_, i) => (
              <FaStar key={i} />
            ))}
          </span>
        </div>
      </div>
      {/* Botones de acción */}
      <div className="flex flex-row gap-3 items-center justify-end mt-2 relative">
        <a
          href={`tel:${business.phone}`}
          className="px-3 py-2 bg-blue-500 text-white rounded-full text-lg font-bold hover:bg-blue-600 shadow-sm flex items-center justify-center border border-blue-200 transition-colors duration-150"
          title="Llamar"
          onClick={e => e.stopPropagation()}
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
          onClick={e => e.stopPropagation()}
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
          onClick={e => e.stopPropagation()}
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <FaFacebookF className="text-xl" />
          </span>
        </a>
        {/* Botón único de compartir */}
        <div onClick={e => e.stopPropagation()}>
          <ShareButton business={business} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(BusinessCard);

