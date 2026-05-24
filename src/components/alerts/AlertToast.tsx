/**
 * @file AlertToast.tsx
 * @description Integrated toast manager utilizing react-hot-toast to announce triggers.
 */

import React from 'react';
import toast from 'react-hot-toast';
import { Bell, ShieldAlert } from 'lucide-react';

export const showSMCAlert = (title: string, message: string) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-[#1C2230] border border-[#2D313E] shadow-2xl rounded-xl pointer-events-auto flex p-4.5 font-sans`}
    >
      <div className="flex-1 w-0">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <Bell className="text-light h-5 w-5 animate-bounce" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-white">{title}</p>
            <p className="mt-1 text-xs text-text-secondary leading-snug">{message}</p>
          </div>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="bg-transparent rounded-md inline-flex text-gray-500 hover:text-zinc-300 focus:outline-none cursor-pointer text-xs uppercase tracking-wider font-mono font-bold"
        >
          CLOSE
        </button>
      </div>
    </div>
  ));
};

export const AlertToast: React.FC = () => {
  return (
    <div className="text-center p-3 text-xs bg-zinc-950/40 rounded border border-gray-800">
      <span className="font-mono text-gray-400 font-bold">System Alerts Toast Stream Configured</span>
    </div>
  );
};

export default AlertToast;
