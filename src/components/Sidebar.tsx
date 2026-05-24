import React, { useState } from 'react';
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
  TrendingDown,
  User,
  Users
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  openPersonasModal: () => void;
}

export default function Sidebar({ activePage, setActivePage, openPersonasModal }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      id="auto-slp-sidebar"
      className={`fixed top-12 left-0 h-[calc(100vh-48px)] z-40 bg-[#202940] border-r border-[#2A2E39] text-gray-300 transition-all duration-300 flex flex-col justify-between ${
        isExpanded ? 'w-[220px]' : 'w-[64px]'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Toggle button to signify visual control */}
      <div className="absolute -right-3 top-4 hidden md:flex bg-[#2A2E39] text-gray-400 hover:text-white rounded-full p-1 border border-[#3A435E] cursor-pointer">
        {isExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center py-3 px-5 transition-all duration-200 group text-left relative ${
                isActive 
                  ? 'bg-[#1A1F2C] text-[#CAAA98] font-bold border-l-4 border-[#CAAA98]' 
                  : 'hover:bg-[#1C2335] hover:text-white'
              }`}
            >
              {/* Active bar overlay */}
              {isActive && (
                <span className="absolute right-0 top-0 bottom-0 w-1 bg-[#CAAA98]" />
              )}
              
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 text-[#CAAA98]' : 'text-gray-400 group-hover:text-gray-200'}`}>
                <Icon size={20} className="shrink-0" />
              </div>

              {/* Text Label with specific uppercase styling from specification */}
              <span 
                className={`ml-4 whitespace-nowrap text-[11px] uppercase tracking-wider font-semibold transition-opacity duration-300 ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {item.label}
              </span>

              {/* Collapsed Tooltip */}
              {!isExpanded && (
                <div className="absolute left-16 bg-[#111622] text-xs text-gray-200 py-1.5 px-3 rounded shadow-xl border border-[#2A2E39] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile and Personas Trigger */}
      <div className="border-t border-[#2A2E39] p-3 space-y-2">
        {/* Personas Quick dossier hub */}
        <button
          id="btn-trigger-personas"
          onClick={openPersonasModal}
          className="w-full flex items-center hover:bg-[#1E2538] p-2 rounded-lg transition-colors text-left text-xs text-gray-400 hover:text-[#CAAA98] relative group"
        >
          <Users size={20} className="shrink-0 text-[#CAAA98] group-hover:scale-110 transition-transform" />
          <span className={`ml-3 text-[10px] uppercase tracking-wider font-semibold ${isExpanded ? 'inline' : 'hidden'}`}>
            Trader Personas
          </span>
          {!isExpanded && (
            <div className="absolute left-16 bg-[#111622] text-xs text-gray-200 py-1.5 px-3 rounded shadow-xl border border-[#2A2E39] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
              Trader Personas Dossier
            </div>
          )}
        </button>

        {/* User Card */}
        <div className="flex items-center p-1 rounded-lg">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-[#CAAA98] flex items-center justify-center text-white font-semibold text-xs">
              M
            </div>
            {/* Online Green Indicator Dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#26A69A] border-2 border-[#202940] rounded-full" />
          </div>

          <div className={`ml-3 transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            <div className="text-[11px] font-bold text-gray-200 whitespace-nowrap">Marcus Vance</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[9px] bg-[#26A69A]/15 text-[#26A69A] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Pro Plan
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
