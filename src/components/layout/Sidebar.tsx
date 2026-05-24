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
      className={`fixed top-0 left-0 h-screen z-40 bg-[#202940] border-r border-[#2C354E] text-gray-300 transition-all duration-200 ease-in-out flex flex-col justify-between ${
        isExpanded ? 'w-[220px]' : 'w-[64px]'
      }`}
    >
      {/* Top section: SLP TRADER logo (220px expanded) / S icon (64px collapsed) with tagline */}
      <div className={`p-4 py-5 border-b border-[#2C354E] flex flex-col ${isExpanded ? 'items-start' : 'items-center'} justify-center shrink-0 overflow-hidden`}>
        {isExpanded ? (
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[#CAAA98] font-bold tracking-tight text-md font-display uppercase">SLP TRADER</span>
            </div>
            <span className="text-[9px] text-gray-400 font-mono leading-none tracking-widest mt-1 block uppercase">
              Directional Bias System
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-[#CAAA98] flex items-center justify-center text-slate-900 font-black text-sm select-none shadow-md">
            S
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-[calc(100%-16px)] flex items-center py-2.5 px-4 mx-2 my-0.5 rounded-md transition-all duration-200 group text-left relative ${
                isActive 
                  ? 'bg-[#181F33] text-[#CAAA98] font-bold border-l-4 border-[#CAAA98]' 
                  : 'text-gray-400 hover:bg-[#2C354E] hover:text-white'
              }`}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-[#CAAA98]' : 'text-gray-400 group-hover:text-gray-200'}`}>
                <Icon size={18} className="shrink-0" />
              </div>

              <span 
                className={`ml-3 whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold transition-opacity duration-200 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#2C354E] p-3 space-y-2">
        <button
          onClick={openPersonasModal}
          className="w-full flex items-center hover:bg-[#2C354E] p-2 rounded-md transition-colors text-left text-xs text-gray-400 hover:text-white relative group"
        >
          <Users size={18} className="shrink-0 text-[#CAAA98] group-hover:scale-110 transition-transform" />
          <span className={`ml-3 text-[10px] uppercase tracking-wider font-semibold ${isExpanded ? 'inline' : 'hidden'}`}>
            Trader Personas
          </span>
        </button>

        {/* Separator line */}
        <div className="border-t border-[#2C354E]/50 my-1" />

        {/* User profile section */}
        <div className="flex items-center p-1 rounded-lg">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-[#CAAA98] flex items-center justify-center text-white font-semibold text-xs animate-pulse">
              M
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#202940] rounded-full" />
          </div>

          <div className={`ml-3 transition-opacity duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            <div className="text-[11px] font-bold text-gray-200 whitespace-nowrap">Marcus Vance</div>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
              PRO PLAN
            </span>
          </div>
        </div>

        {/* Toggle Expand/Collapse Controller Button */}
        <button
          onClick={toggleExpanded}
          className="w-full flex items-center hover:bg-[#2C354E] p-2 rounded-md transition-colors text-left text-xs text-gray-400 hover:text-white cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronLeft size={16} className="shrink-0 text-gray-400 group-hover:text-white" />
              <span className="ml-3 text-[10px] uppercase tracking-wider font-semibold">Collapse Sidebar</span>
            </>
          ) : (
            <>
              <ChevronRight size={16} className="shrink-0 mx-auto text-gray-400 group-hover:text-white" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
