/**
 * @file MainLayout.tsx
 * @description Main Layout component binding sidebar, header, and content frames together.
 */

import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useUIStore } from '../../store/useUIStore';

export interface MainLayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  openPersonasModal: () => void;
  onOpenSpecs: () => void;
  onOpenSearch: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activePage,
  setActivePage,
  openPersonasModal,
  onOpenSpecs,
  onOpenSearch,
}) => {
  const isExpanded = useUIStore((state) => state.sidebarExpanded);

  return (
    <div id="main-layout-container" className="min-h-screen bg-surface text-text-primary font-sans">
      <Header onOpenSpecs={onOpenSpecs} onOpenSearch={onOpenSearch} />
      <Sidebar activePage={activePage} setActivePage={setActivePage} openPersonasModal={openPersonasModal} />
      
      <div 
        className="transition-all duration-300 pt-12 min-h-[calc(100vh-48px)] flex flex-col justify-between"
        style={{ paddingLeft: isExpanded ? '220px' : '64px' }}
      >
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
