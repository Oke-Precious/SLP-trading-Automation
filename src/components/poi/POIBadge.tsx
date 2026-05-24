/**
 * @file POIBadge.tsx
 * @description Standard colored badge representing POI statuses.
 */

import React from 'react';

export interface POIBadgeProps {
  status: 'Active' | 'Mitigated' | 'Tested';
}

export const POIBadge: React.FC<POIBadgeProps> = ({ status }) => {
  const styles = {
    Active: 'bg-[#26A69A]/15 text-bullish border-[#26A69A]/30 poi-pulse-green',
    Tested: 'bg-neutral/15 text-neutral border-neutral/30',
    Mitigated: 'bg-zinc-800 text-gray-500 border-zinc-700',
  };

  return (
    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default POIBadge;
