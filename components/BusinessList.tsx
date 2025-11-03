import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import BusinessCard from "./BusinessCard";
import Favorites from "./Favorites";
import { Business } from "../types/business";
import { useDebounce } from "../hooks/useDebounce";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";

const BusinessModal = dynamic(() => import("./BusinessModal"), { ssr: false });

const SHEET_URL = process.env.NEXT_PUBLIC_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6GXWtda697t29fnUQtwT8u7f4ypU1VH0wmiH9J2GS280NrSKd8L_PWUVVgEPgq8Is1lYgD26bxAoT/pub?output=csv";

export default function BusinessList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    async function load() {
      try {
        // 1) Intentar cargar desde Firestore (solo aprobados)
        const snap = await getDocs(
          query(collection(db, "businesses"), where("status", "==", "approved"))
        );
        const list: Business[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (list.length > 0) {
          const normalized = list.map((b: any) => ({
            ...b,
            rating: Number.isFinite(Number(b.rating)) ? Number(b.rating) : 0,
          })) as Business[];
          setBusinesses(normalized);
          migrateFavorites(normalized);
          return;
        }
      } catch {
        // Ignorar y pasar al CSV
      }

      // 2) Fallback al CSV si Firestore está vacío o falló
      try {
        const res = await fetch(SHEET_URL);
        const csv = await res.text();
        const lines = csv.split("\n").filter((l) => l.trim().length);
        if (!lines.length) return;
        const headers = lines[0].split(",").map((h) => h.trim());
        const data: Business[] = lines.slice(1).map((line) => {
          const values = line.split(",");
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = (values[i] ?? "").toString().trim();
          });
          obj.rating = Number.isFinite(Number(obj.rating)) ? Number(obj.rating) : 0;
          return obj as Business;
        });
        const clean = data.filter((b) => b && (b.id || b.name));
        setBusinesses(clean);
        migrateFavorites(clean);
      } catch {
        // Silenciar
      }
    }

    function migrateFavorites(arr: Business[]) {
      const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
      if (Array.isArray(saved) && saved.length) {
        const ids = new Set(arr.map((b) => b.id));
        const nameToId = new Map(arr.map((b) => [b.name, b.id] as const));
        const migrated: string[] = [];
        for (const item of saved) {
          if (typeof item === "string") {
            if (ids.has(item)) migrated.push(item);
            else if (nameToId.has(item)) migrated.push(nameToId.get(item)!);
          }
        }
        setFavorites(migrated);
        localStorage.setItem("favorites", JSON.stringify(migrated));
      }
    }

    load();
  }, []);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const filtered = useMemo(() => {
    return businesses
      .filter((b) =>
        (!debouncedSearch || b.name?.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
        (!category || b.category === category) &&
        (!location || b.address === location)
      )
      .sort((a, b) => {
        if (a.featured === "si" && b.featured !== "si") return -1;
        if (a.featured !== "si" && b.featured === "si") return 1;
        return 0;
      });
  }, [businesses, debouncedSearch, category, location]);

  const categories = useMemo(
    () => Array.from(new Set(businesses.map((b) => b.category))).filter(Boolean),
    [businesses]
  );
  const locations = useMemo(
    () => Array.from(new Set(businesses.map((b) => b.address))).filter(Boolean),
    [businesses]
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return (
    <section className="max-w-8xl mx-auto px-10 py-8">
      {/* Filtros de búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gradient-to-r from-blue-50 via-white to-yellow-50 rounded-xl shadow p-4 border border-gray-100 animate-fadeIn">
        <input
          type="text"
          placeholder="Buscar negocio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/3 text-lg shadow focus:ring-2 focus:ring-blue-200 transition-all"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/4 text-lg shadow focus:ring-2 focus:ring-yellow-200 transition-all"
        >
          <option value="">Categoría</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 w-full md:w-1/4 text-lg shadow focus:ring-2 focus:ring-green-200 transition-all"
        >
          <option value="">Ubicación</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Favoritos */}
      <Favorites businesses={businesses} favorites={favorites} />

      {/* Grid de negocios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {filtered.map((b) => (
          <div
            key={b.id || b.name}
            className="cursor-pointer animate-fadeIn"
            onClick={() => setSelected(b)}
          >
            <BusinessCard business={b} />
          </div>
        ))}
      </div>

      {/* Modal de negocio */}
      {selected && (
        <BusinessModal
          business={selected}
          onClose={() => setSelected(null)}
          isFavorite={!!selected.id && favorites.includes(selected.id)}
          onFavorite={(id) => toggleFavorite(id)}
        />
      )}
    </section>
  );
}

