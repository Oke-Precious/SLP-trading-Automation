/**
 * @file AlertBell.tsx
 * @description Bell trigger.
 */

import React from 'react';
import { Bell } from 'lucide-react';

export interface AlertBellProps {
  alertsCount: number;
  onClick?: () => void;
}

export const AlertBell: React.FC<AlertBellProps> = ({ alertsCount, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-surface transition-colors cursor-pointer"
    >
      <Bell size={18} className={alertsCount > 0 ? 'animate-pulse' : ''} />
      {alertsCount > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-card flex items-center justify-center text-[8px] text-white">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        </span>
      )}
    </button>
  );
};

export default AlertBell;
