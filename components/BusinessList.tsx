import React, { useEffect, useState } from "react";
import BusinessCard from "./BusinessCard";
import BusinessModal from "./BusinessModal";
import BusinessMap from "./BusinessMap";
import Favorites from "./Favorites";
import ReviewSection from "./ReviewSection";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6GXWtda697t29fnUQtwT8u7f4ypU1VH0wmiH9J2GS280NrSKd8L_PWUVVgEPgq8Is1lYgD26bxAoT/pub?output=csv";

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(SHEET_URL)
      .then((res) => res.text())
      .then((csv) => {
        const lines = csv.split("\n");
        const headers = lines[0].split(",");
        const data = lines.slice(1).map((line) => {
          const values = line.split(",");
          const obj: any = {};
          headers.forEach((h, i) => (obj[h.trim()] = values[i]?.trim() || ""));
          return obj;
        });
        // Log para depuración: mostrar cómo llega cada negocio
        data.forEach((b, i) => console.log(`Negocio ${i}:`, b));
        setBusinesses(data.filter((b) => b.name));
      });
    setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
  }, []);

  const filtered = businesses
    .filter((b) => {
      return (
        (!search || b.name?.toLowerCase().includes(search.toLowerCase())) &&
        (!category || b.category === category) &&
        (!location || b.address === location)
      );
    })
    .sort((a, b) => {
      // Destacados primero
      if (a.featured === "si" && b.featured !== "si") return -1;
      if (a.featured !== "si" && b.featured === "si") return 1;
      return 0;
    });

  return (
    <section className="max-w-8xl mx-auto px-10 py-8">
      {/* Filtros de búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gradient-to-r from-blue-50 via-white to-yellow-50 rounded-xl shadow p-4 border border-gray-100 animate-fadeIn">
        <input
          type="text"
          placeholder="🔍 Buscar negocio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/3 text-lg shadow focus:ring-2 focus:ring-blue-200 transition-all"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/4 text-lg shadow focus:ring-2 focus:ring-yellow-200 transition-all">
          <option value="">Categoría</option>
          {[...new Set(businesses.map((b) => b.category))].filter(Boolean).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/4 text-lg shadow focus:ring-2 focus:ring-green-200 transition-all">
          <option value="">Ubicación</option>
          {[...new Set(businesses.map((b) => b.address))].filter(Boolean).map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      {/* Favoritos */}
      <Favorites businesses={businesses} favorites={favorites} setFavorites={setFavorites} />
      {/* Grid de negocios */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {filtered.map((b, idx) => (
          <div
            key={idx}
            className="cursor-pointer animate-fadeIn"
            onClick={() => setSelected(b)}
          >
            <BusinessCard
              business={b}
              isFavorite={favorites.includes(b.id) || favorites.includes(b.name) || false}
              onFavorite={(id) => {
                let newFavs = favorites.includes(id)
                  ? favorites.filter((fav) => fav !== id)
                  : [...favorites, id];
                setFavorites(newFavs);
                localStorage.setItem("favorites", JSON.stringify(newFavs));
              }}
            />
          </div>
        ))}
      </div>
      {/* Modal de negocio */}
      {selected && (
        <BusinessModal
          business={selected}
          onClose={() => setSelected(null)}
          isFavorite={favorites.includes(selected.id) || favorites.includes(selected.name) || false}
          onFavorite={(id) => {
            let newFavs = favorites.includes(id)
              ? favorites.filter((fav) => fav !== id)
              : [...favorites, id];
            setFavorites(newFavs);
            localStorage.setItem("favorites", JSON.stringify(newFavs));
          }}
        />
      )}
      {/* Mapa y reseñas 
      <BusinessMap businesses={filtered} />
      <ReviewSection businesses={filtered} />*/}
    </section>
  );
}
