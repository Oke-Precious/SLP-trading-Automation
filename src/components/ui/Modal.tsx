/**
 * @file Modal.tsx
 * @description Flexible custom modal portal with animation backdrops.
 */

import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Backdrop motion wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border-custom w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-[#2A2E39] flex items-center justify-between bg-[#1A202E]">
          <h2 className="text-base font-bold font-display uppercase tracking-wide text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] text-sm text-text-secondary">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Modal;
