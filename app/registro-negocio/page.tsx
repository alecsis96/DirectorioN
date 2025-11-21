import type { Metadata } from 'next';

import BusinessWizard from '../../components/BusinessWizard';

export const metadata: Metadata = {
  title: 'Registro de negocio | Directorio',
  description: 'Completa el asistente para registrar tu negocio en el directorio de Yajalón.',
};

export default function RegistroNegocioPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-6 py-12 pb-24 md:pb-12 text-gray-800">
      <section className="mx-auto max-w-5xl">
        <BusinessWizard />
      </section>
    </main>
  );
}
