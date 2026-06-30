import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isInitializing } = useAuthStore();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#131722] flex flex-col items-center justify-center p-4">
        <LoadingSpinner size="lg" />
        <span className="mt-4 font-mono text-xs text-gray-400 uppercase tracking-widest animate-pulse">
          Authenticating...
        </span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
