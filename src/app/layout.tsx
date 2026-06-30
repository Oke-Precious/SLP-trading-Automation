/**
 * @file layout.tsx
 * @description Next.js App Router Root layout shell with global context configurations.
 */

import React from 'react';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'AutoSLP - SMC Directional Bias System',
  description: 'Production-grade Smart Money Concepts Trading Terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#131722] text-[#E0E3EB]">
      <body className="font-sans antialiased min-h-screen">
        <div id="next-app-root">
          <Toaster position="top-right" />
          {children}
        </div>
      </body>
    </html>
  );
}
