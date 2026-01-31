/**
 * BusinessCardVertical - Wrapper para BusinessCard v2
 * Este componente ahora es un simple wrapper que usa BusinessCard.tsx
 * con el diseño v2 unificado que maneja todos los planes (free, featured, sponsor)
 * 
 * @deprecated - Se mantiene por compatibilidad. Migrar a BusinessCard directamente.
 */

'use client';

import React from 'react';
import BusinessCard from './BusinessCard';
import type { Business, BusinessPreview } from '../types/business';

type CardBusiness = BusinessPreview | Business;

type Props = {
  business: CardBusiness;
  onViewDetails?: (business: CardBusiness) => void;
};

const BusinessCardVertical: React.FC<Props> = ({ business, onViewDetails }) => {
  // Wrapper: delega todo a BusinessCard v2 que maneja la lógica de planes
  const handleViewDetails = (b: BusinessPreview) => {
    if (onViewDetails) {
      onViewDetails(b);
    }
  };

  return <BusinessCard business={business} onViewDetails={handleViewDetails} />;
};

export default React.memo(BusinessCardVertical);
