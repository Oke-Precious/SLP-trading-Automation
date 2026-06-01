/**
 * @file useUIStore.ts
 * @description Zustand store for UI states such as sidebar triggers and modals.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarExpanded: boolean;
  activeModal: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      activeModal: null,
      connectionStatus: 'disconnected',
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
    }),
    {
      name: 'autoSLP-ui',
      partialize: (state) => ({ sidebarExpanded: state.sidebarExpanded }),
    }
  )
);
