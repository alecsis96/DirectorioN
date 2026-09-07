import type { Metadata } from 'next';
import { connection } from 'next/server';

import BusinessWizard from '../../components/BusinessWizard';
import { PUBLIC_APPLICATION_V2_ENABLED } from '../../lib/featureFlags';

export const metadata: Metadata = {
  title: 'Registro de negocio | Directorio',
  description: 'Completa el asistente para registrar tu negocio en el directorio de Yajalón.',
};

export default async function RegistroNegocioPage() {
  await connection();
  const configuredTurnstileMode = process.env.PUBLIC_APPLICATION_TURNSTILE_MODE;
  const turnstileMode = configuredTurnstileMode === 'observe' || configuredTurnstileMode === 'enforce'
    ? configuredTurnstileMode
    : 'off';

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 py-6 pb-20 text-gray-800 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-5xl">
        <BusinessWizard
          publicApplicationV2Enabled={PUBLIC_APPLICATION_V2_ENABLED}
          turnstileMode={turnstileMode}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
        />
      </section>
    </main>
  );
}
