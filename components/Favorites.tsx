import React from "react";

export default function Favorites({ businesses, favorites, setFavorites }: any) {
  if (!favorites.length) return null;
  const favBusinesses = businesses.filter((b: any) => favorites.includes(b.Nombre));
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-[#38761D] mb-2">Tus favoritos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favBusinesses.map((b: any, idx: number) => (
          <div key={idx} className="bg-yellow-50 border border-yellow-300 rounded p-2">
            <span className="font-semibold">{b.Nombre}</span> - {b.Categoría}
          </div>
        ))}
      </div>
    </div>
  );
}
