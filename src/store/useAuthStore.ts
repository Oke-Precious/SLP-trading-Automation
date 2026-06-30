import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user:         any | null;
  accessToken:  string | null;
  isLoggedIn:   boolean;
  isInitializing: boolean;
  setAuth:      (user: any, token: string) => void;
  clearAuth:    () => void;
  setToken:     (token: string) => void;
  setInitializing: (isInitializing: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,
      isLoggedIn:  false,
      isInitializing: true,
      setAuth:     (user, accessToken) => set({ user, accessToken, isLoggedIn: true, isInitializing: false }),
      clearAuth:   ()                  => set({ user: null, accessToken: null, isLoggedIn: false, isInitializing: false }),
      setToken:    (accessToken)       => set({ accessToken }),
      setInitializing: (isInitializing) => set({ isInitializing }),
    }),
    { 
      name: 'autoSLP-auth', 
      partialize: s => ({ user: s.user, accessToken: s.accessToken, isLoggedIn: s.isLoggedIn }) 
    }
  )
);
