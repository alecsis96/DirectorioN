import React, { useState } from "react";

export default function ShareButton({ business }: { business: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-lg font-bold shadow hover:bg-gray-200 flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        title="Compartir"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 11-6 0 3 3 0 016 0zm-6 8a3 3 0 016 0m-6 0a3 3 0 016 0" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-10 min-w-[160px]">
          <button
            className="w-full text-left px-4 py-2 hover:bg-green-100 text-green-700 flex items-center gap-2"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(`Mira este negocio: ${business.name}\n${business.description}\nDirección: ${business.address}`);
              window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
              setOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M20.52 3.48A12 12 0 1 0 21 12a12 12 0 0 0-.48-8.52ZM12 21a9 9 0 1 1 9-9a9 9 0 0 1-9 9Zm4.29-7.71l-1.25-.37a.75.75 0 0 0-.72.15l-.32.26a6.54 6.54 0 0 1-3.13-3.13l.26-.32a.75.75 0 0 0 .15-.72l-.37-1.25a.75.75 0 0 0-.72-.52H8.5a1.25 1.25 0 0 0-1.25 1.25A7.75 7.75 0 0 0 15.25 17.5a1.25 1.25 0 0 0 1.25-1.25v-1.13a.75.75 0 0 0-.52-.72Z"/></svg>
            Compartir por WhatsApp
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-blue-100 text-blue-700 flex items-center gap-2"
            onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(`Mira este negocio: ${business.name}`);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}` , "_blank");
              setOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.675 0h-21.35C.6 0 0 .6 0 1.326v21.348C0 23.4.6 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788c1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.726 0 1.326-.6 1.326-1.326V1.326C24 .6 23.4 0 22.675 0"/></svg>
            Compartir en Facebook
          </button>
        </div>
      )}
    </div>
  );
}
