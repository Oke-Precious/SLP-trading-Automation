/**
 * @file Sidebar.tsx
 * @description Layout sidebar navigation matching the design pattern.
 */

import React from 'react';
import { 
  Home, 
  LayoutGrid, 
  Compass, 
  Layers, 
  Target, 
  Briefcase, 
  Bell, 
  TrendingUp, 
  BookOpen, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  openPersonasModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, openPersonasModal }) => {
  const isExpanded = useUIStore((state) => state.sidebarExpanded);
  const toggleExpanded = useUIStore((state) => state.toggleSidebar);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'market-overview', label: 'Market Overview', icon: LayoutGrid },
    { id: 'directional-bias', label: 'Directional Bias', icon: Compass },
    { id: 'poi-map-page', label: 'POI Map', icon: Layers },
    { id: 'trade-setups', label: 'Trade Setups', icon: Target },
    { id: 'positions', label: 'Positions', icon: Briefcase },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'backtest', label: 'Backtest', icon: TrendingUp },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="root-layout-sidebar"
      className={`fixed top-12 left-0 h-[calc(100vh-48px)] z-40 bg-nav border-r border-[#2A2E39] text-gray-300 transition-all duration-300 flex flex-col justify-between ${
        isExpanded ? 'w-[220px]' : 'w-[64px]'
      }`}
    >
      {/* Toggle slider controller */}
      <div 
        onClick={toggleExpanded}
        className="absolute -right-3 top-4 hidden md:flex bg-[#2A2E39] text-gray-400 hover:text-white rounded-full p-1 border border-[#3A435E] cursor-pointer"
      >
        {isExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center py-3 px-5 transition-all duration-200 group text-left relative ${
                isActive 
                  ? 'bg-surface text-light font-bold border-l-4 border-light' 
                  : 'hover:bg-[#1C2335] hover:text-white'
              }`}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-light' : 'text-gray-400 group-hover:text-gray-200'}`}>
                <Icon size={20} className="shrink-0" />
              </div>

              <span 
                className={`ml-4 whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold transition-opacity duration-300 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#2A2E39] p-3 space-y-2">
        <button
          onClick={openPersonasModal}
          className="w-full flex items-center hover:bg-[#1E2538] p-2 rounded-lg transition-colors text-left text-xs text-gray-400 hover:text-light relative group"
        >
          <Users size={20} className="shrink-0 text-light group-hover:scale-110 transition-transform" />
          <span className={`ml-3 text-[10px] uppercase tracking-wider font-semibold ${isExpanded ? 'inline' : 'hidden'}`}>
            Trader Personas
          </span>
        </button>

        <div className="flex items-center p-1 rounded-lg">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-light flex items-center justify-center text-white font-semibold text-xs animate-pulse">
              M
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-bullish border-2 border-nav rounded-full" />
          </div>

          <div className={`ml-3 transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            <div className="text-[11px] font-bold text-gray-200 whitespace-nowrap">Marcus Vance</div>
            <span className="text-[9px] bg-bullish/15 text-bullish px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              PRO TRADER
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
