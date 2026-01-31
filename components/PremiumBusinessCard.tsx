/**
 * PremiumBusinessCard - Wrapper para BusinessCard v2
 * Este componente ahora es un simple wrapper que usa BusinessCard.tsx
 * con el diseño v2 unificado que maneja todos los planes (free, featured, sponsor)
 * 
 * @deprecated - Se mantiene por compatibilidad. Migrar a BusinessCard directamente.
 */

'use client';

import BusinessCard from './BusinessCard';
import type { BusinessPreview } from '../types/business';

interface PremiumBusinessCardProps {
  business: BusinessPreview;
  onViewDetails: (business: BusinessPreview) => void;
}

export default function PremiumBusinessCard({ 
  business, 
  onViewDetails
}: PremiumBusinessCardProps) {
  // Wrapper: delega todo a BusinessCard v2 que maneja la lógica de planes
  return <BusinessCard business={business} onViewDetails={onViewDetails} />;
}
