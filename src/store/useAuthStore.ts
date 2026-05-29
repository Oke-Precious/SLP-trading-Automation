import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user:         any | null;
  accessToken:  string | null;
  isLoggedIn:   boolean;
  setAuth:      (user: any, token: string) => void;
  clearAuth:    () => void;
  setToken:     (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,
      isLoggedIn:  false,
      setAuth:     (user, accessToken) => set({ user, accessToken, isLoggedIn: true }),
      clearAuth:   ()                  => set({ user: null, accessToken: null, isLoggedIn: false }),
      setToken:    (accessToken)       => set({ accessToken }),
    }),
    { 
      name: 'autoSLP-auth', 
      partialize: s => ({ user: s.user, accessToken: s.accessToken, isLoggedIn: s.isLoggedIn }) 
    }
  )
);
