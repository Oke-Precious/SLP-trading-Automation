/**
 * @file page.tsx
 * @description Root Next.js page initiating the redirection or rendering.
 */

import React from 'react';

export default function RootPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#131722] text-[#E0E3EB]">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-display tracking-widest text-[#CAAA98]">AUTOSLP TERMINAL</h1>
        <p className="text-sm text-gray-500 font-mono mt-2">REDIRECTING TO ACTIVE /DASHBOARD RUNTIME...</p>
      </div>
    </div>
  );
}
