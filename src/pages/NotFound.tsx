import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#131722] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-[#CAAA98] text-6xl font-bold mb-4">404</p>
        <h1 className="text-white text-xl font-semibold mb-2">Page Not Found</h1>
        <p className="text-[#9AA3B2] text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/dashboard" 
          className="inline-block bg-[#CAAA98] text-[#202940] font-bold uppercase tracking-wider py-2.5 px-6 rounded-md text-xs hover:bg-[#b89a88] transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
