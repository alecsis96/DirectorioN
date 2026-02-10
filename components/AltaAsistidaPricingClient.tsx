'use client';

import PricingHero from '@/components/PricingHero';

type PlanTier = 'free' | 'destacado' | 'patrocinado';

export default function AltaAsistidaPricingClient() {
  const handleSelectPlan = (plan: PlanTier) => {
    const planNames = {
      free: 'Básico (Gratis)',
      destacado: 'Destacado',
      patrocinado: 'Patrocinado'
    };
    const mensaje = encodeURIComponent(
      `Hola! Quiero contratar el plan ${planNames[plan]}.\n\n` +
      'Datos de mi negocio:\n' +
      '• Nombre: \n' +
      '• Categoría: \n' +
      '• Dirección: \n' +
      '• WhatsApp: '
    );
    window.open(`https://wa.me/5219191565865?text=${mensaje}`, '_blank');
  };

  return (
    <PricingHero 
      categoryId="general"
      showAltaAsistida={true}
      onSelectPlan={handleSelectPlan}
    />
  );
}
