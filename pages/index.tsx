import BusinessList from "../components/BusinessList";
import RegisterForm from "../components/RegisterForm";
import React, { useState } from "react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  // Banners dinámicos
  const banners = [
    {
      text: "Publicidad destacada: ¡Tu negocio aquí!",
      sub: "(Paga un extra para aparecer en este banner)",
      color: "from-yellow-400 via-yellow-300 to-yellow-500 text-yellow-900 border-yellow-300"
    },
    {
      text: "¡Promoción especial en Panadería La Estrella!",
      sub: "Descuento del 10% solo este mes.",
      color: "from-pink-300 via-yellow-100 to-pink-200 text-pink-900 border-pink-300"
    },
    {
      text: "¡Anúnciate aquí y llega a más clientes!",
      sub: "Contacta para tarifas de publicidad.",
      color: "from-blue-200 via-white to-blue-300 text-blue-900 border-blue-300"
    }
  ];
  const [bannerIdx, setBannerIdx] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx(idx => (idx + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eafbe7] to-white text-gray-800 px-6 py-12">
      {/* Banner de publicidad dinámico */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className={`bg-gradient-to-r ${banners[bannerIdx].color} text-center py-3 font-bold text-lg tracking-wide shadow-md rounded-xl border transition-all duration-700 animate-fadeIn`}>
          {banners[bannerIdx].text} <span className="ml-2 text-xs font-normal">{banners[bannerIdx].sub}</span>
        </div>
      </div>
      <section className="max-w-3xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#38761D]">Directorio de Negocios de Yajalón, Chiapas</h1>
        <p className="text-lg mb-6">Encuentra negocios locales fácilmente, filtra por categoría, ubicación y más. Agrega tu negocio y ayuda a crecer la comunidad.</p>
      </section>
      <BusinessList />
      <section className="max-w-2xl mx-auto mt-16 mb-10 text-center">
        {!showForm ? (
          <>
            <h3 className="text-xl font-bold text-[#38761D] mb-4">¿Quieres registrar tu negocio?</h3>
            <button
              className="px-6 py-3 bg-[#38761D] text-white rounded font-bold shadow hover:bg-[#2e5c16] transition mb-4"
              onClick={() => setShowForm(true)}
            >
              Registrar mi negocio
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
    </main>
  );
}
