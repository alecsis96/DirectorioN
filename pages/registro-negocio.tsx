import React from "react";
import Head from "next/head";
import BusinessWizard from "../components/BusinessWizard";

export default function RegistroNegocioPage() {
  return (
    <>
      <Head>
        <title>Registro de negocio | Directorio</title>
        <meta
          name="description"
          content="Completa el asistente para registrar tu negocio en el directorio de Yajalon."
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-12 text-gray-800">
        <section className="mx-auto max-w-5xl">
          <BusinessWizard />
        </section>
      </main>
    </>
  );
}
