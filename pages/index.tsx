import BusinessList from "../components/BusinessList";
import RegisterForm from "../components/RegisterForm";
import React, { useState } from "react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eafbe7] to-white text-gray-800 px-6 py-12">
      <section className="max-w-3xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#38761D]">Directorio de Negocios de Yajalón</h1>
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
