import React, { useState } from "react";
import { FaShareAlt, FaWhatsapp, FaFacebookF } from "react-icons/fa";

export default function ShareButton({ business }: { business: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-lg font-bold shadow hover:bg-gray-200 flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        title="Compartir"
      >
        <FaShareAlt className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-10 min-w-[180px]">
          <button
            className="w-full text-left px-4 py-2 hover:bg-green-100 text-green-700 flex items-center gap-2"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(`Mira este negocio: ${business.name}\n${business.description}\nDirección: ${business.address}`);
              window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
              setOpen(false);
            }}
          >
            <FaWhatsapp className="w-4 h-4" />
            Compartir por WhatsApp
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-blue-100 text-blue-700 flex items-center gap-2"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(`Mira este negocio: ${business.name}`);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, "_blank");
              setOpen(false);
            }}
          >
            <FaFacebookF className="w-4 h-4" />
            Compartir en Facebook
          </button>
        </div>
      )}
    </div>
  );
}

