
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import BusinessList from "../components/BusinessList";
import RegisterForm from "../components/RegisterForm";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const banners = [
    { text: "Publicidad destacada: Tu negocio aqui!", sub: "(Anuncio premium disponible)", color: "from-yellow-400 via-yellow-300 to-yellow-500 text-yellow-900 border-yellow-300" },
    { text: "Promocion especial en Panaderia La Estrella!", sub: "Descuento del 10% solo este mes.", color: "from-pink-300 via-yellow-100 to-pink-200 text-pink-900 border-pink-300" },
    { text: "Anunciate aqui y llega a mas clientes!", sub: "Contacta para tarifas de publicidad.", color: "from-blue-200 via-white to-blue-300 text-blue-900 border-blue-300" }
  ];
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => setBannerIdx((index) => (index + 1) % banners.length), 5000);
    return () => clearInterval(intervalId);
  }, []);

  const bannerClass =
    "bg-gradient-to-r " +
    banners[bannerIdx].color +
    " text-center py-3 font-bold text-lg tracking-wide shadow-md rounded-xl border transition-all duration-700 animate-fadeIn";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eafbe7] to-white text-gray-800 px-6 py-12">
      {/* Banner dinamico */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className={bannerClass}>
          {banners[bannerIdx].text} <span className="ml-2 text-xs font-normal">{banners[bannerIdx].sub}</span>
        </div>
      </div>

      <section className="max-w-3xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#38761D]">Directorio de negocios de Yajalon, Chiapas</h1>
        <p className="text-lg mb-6">Encuentra negocios locales facilmente, filtra por categoria, ubicacion y mas. Agrega tu negocio y ayuda a crecer la comunidad.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/negocios"
            className="px-6 py-3 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          >
            Explorar negocios
          </Link>
          <button
            className="px-6 py-3 rounded bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
            onClick={() => router.push('/business/register')}
          >
            Registrar negocio
          </button>
        </div>
      </section>

      {/* Modo de uso */}
      <section className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white/80 rounded-xl border p-4 shadow">
          <div className="flex-1 text-left">
            <h2 className="text-xl font-semibold">Como quieres usar el directorio?</h2>
            <p className="text-sm text-gray-600">Elige entrar como cliente o registrar tu negocio.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => router.push('/negocios')}
            >
              Entrar como cliente
            </button>
            <button
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              onClick={() => router.push('/business/register')}
            >
              Registrar negocio
            </button>
            {user && (
              <button
                className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  signOut(auth);
                }}
              >
                Cerrar sesion
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Formulario antiguo (si lo quieres mantener a modo informativo) */}
      <section className="max-w-2xl mx-auto mt-16 mb-10 text-center">
        {!showForm ? (
          <>
            <h3 className="text-xl font-bold text-[#38761D] mb-4">Quieres registrar tu negocio?</h3>
            <button
              className="px-6 py-3 bg-[#38761D] text-white rounded font-bold shadow hover:bg-[#2e5c16] transition mb-4"
              onClick={() => setShowForm(true)}
            >
              Click aqui
            </button>
          </>
        ) : (
          <>
            <RegisterForm />
            <button
              className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 rounded font-semibold shadow hover:bg-gray-300 transition"
              onClick={() => setShowForm(false)}
            >
              Cancelar y regresar
            </button>
          </>
        )}
      </section>

      <BusinessList />
    </main>
  );
}
