import React from "react";
import { Business } from "../types/business";

export default function Favorites({ businesses, favorites }: { businesses: Business[]; favorites: string[]; setFavorites?: (ids: string[]) => void; }) {
  if (!favorites?.length) return null;
  const favBusinesses = React.useMemo(() => businesses.filter((b: Business) => !!b.id && favorites.includes(b.id)), [businesses, favorites]);
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-[#38761D] mb-2">Tus favoritos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favBusinesses.map((b: Business) => (
          <div key={b.id || b.name} className="bg-yellow-50 border border-yellow-300 rounded p-2">
            <span className="font-semibold">{b.name}</span> - {b.category}
          </div>
        ))}
      </div>
    </div>
  );
}

