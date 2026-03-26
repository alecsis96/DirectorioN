'use client';

import PricingHero from '@/components/PricingHero';
import { getStoragePlanForVisibleTier } from '@/lib/businessPlanVisibility';

type PlanTier = 'free' | 'premium';

export default function ParaNegociosPricingClient() {
  const handleSelectPlan = (plan: PlanTier) => {
    const label = plan === 'premium' ? 'Premium' : 'Free';
    const storagePlan = getStoragePlanForVisibleTier(plan);
    const mensaje = encodeURIComponent(`Hola, quiero activar el plan ${label} en YajaGon. (${storagePlan})`);
    window.open(`https://wa.me/5219191565865?text=${mensaje}`, '_blank');
  };

  return <PricingHero categoryId="general" showAltaAsistida={true} onSelectPlan={handleSelectPlan} />;
}
