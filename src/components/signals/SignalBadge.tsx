/**
 * @file SignalBadge.tsx
 * @description Standard colored badge representing signal results.
 */

import React from 'react';

export interface SignalBadgeProps {
  isWin: boolean;
}

export const SignalBadge: React.FC<SignalBadgeProps> = ({ isWin }) => {
  return (
    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
      isWin ? 'bg-bullish/10 text-bullish border-bullish/30' : 'bg-bearish/10 text-bearish border-bearish/30'
    }`}>
      {isWin ? 'WIN' : 'LOSS'}
    </span>
  );
};

export default SignalBadge;
