/**
 * @file POIZoneOverlay.tsx
 * @description Graph region overlay illustrating absolute bounds.
 */

import React from 'react';

export interface POIZoneOverlayProps {
  label: string;
  minPrice: number;
  maxPrice: number;
  type: 'demand' | 'supply';
}

export const POIZoneOverlay: React.FC<POIZoneOverlayProps> = ({
  label,
  minPrice,
  maxPrice,
  type,
}) => {
  return (
    <div className={`p-3 rounded border font-sans text-xs ${
      type === 'demand' ? 'bg-bullish/5 border-bullish/30 text-bullish' : 'bg-bearish/5 border-bearish/30 text-bearish'
    }`}>
      <span className="font-bold block uppercase tracking-wide">{label} ({type === 'demand' ? 'Discount Area' : 'Premium Area'})</span>
      <p className="font-mono text-[10px] text-gray-400 mt-1">Bounds: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}</p>
    </div>
  );
};

export default POIZoneOverlay;
