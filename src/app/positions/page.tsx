/**
 * @file page.tsx
 * @description Positions registry page with beautiful empty state.
 */

import React from 'react';
import { EmptyState } from '../../components/ui/EmptyState';

export default function PositionsPage() {
  return (
    <div className="p-6 bg-[#131722] text-[#E0E3EB] min-h-full">
      <h1 className="text-xl font-bold font-display uppercase tracking-wide text-[#CAAA98] mb-6">
        Active Positions Contracts
      </h1>
      
      <div className="bg-[#1E2433] rounded-xl border border-[#2A2E39] p-8 max-w-4xl">
        <EmptyState 
          icon="💼" 
          title="No Active Positions Found" 
          message="No live contract or active leverage positions are currently open. Enter a limit order at an active POI to open a position." 
        />
      </div>
    </div>
  );
}
