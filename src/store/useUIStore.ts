/**
 * @file useUIStore.ts
 * @description Zustand store for UI states such as sidebar triggers and modals.
 */

import { create } from 'zustand';

interface UIState {
  sidebarExpanded: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarExpanded: true,
  activeModal: null,
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
