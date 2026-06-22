import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Users,
  LogOut,
  X
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';

export interface SidebarProps {
  openPersonasModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ openPersonasModal }) => {
  const isExpanded = useUIStore((state) => state.sidebarExpanded);
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const toggleExpanded = useUIStore((state) => state.toggleSidebar);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'market-overview', label: 'Market Overview', icon: LayoutGrid, path: '/market-overview' },
    { id: 'directional-bias', label: 'Directional Bias', icon: Compass, path: '/directional-bias' },
    { id: 'poi-map', label: 'POI Map', icon: Layers, path: '/poi-map' },
    { id: 'trade-setups', label: 'Trade Setups', icon: Target, path: '/trade-setups' },
    { id: 'positions', label: 'Positions', icon: Briefcase, path: '/positions' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts' },
    { id: 'backtest', label: 'Backtest', icon: TrendingUp, path: '/backtest' },
    { id: 'journal', label: 'Journal', icon: BookOpen, path: '/journal' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <aside
        id="root-layout-sidebar"
        className={`fixed top-0 left-0 h-screen z-50 bg-[#202940] border-r border-[#2C354E] text-gray-300 transition-transform duration-300 ease-in-out flex flex-col justify-between 
          md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${isExpanded ? 'md:w-[220px]' : 'md:w-[64px]'} w-[240px] md:w-auto`}
      >
        <div className={`p-4 py-5 border-b border-[#2C354E] flex flex-col ${isExpanded ? 'items-start' : 'items-center'} justify-center shrink-0 overflow-hidden relative`}>
          <button 
            className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X size={20} />
          </button>
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
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `w-[calc(100%-16px)] flex items-center py-2.5 px-4 mx-2 my-0.5 rounded-md transition-all duration-200 group text-left relative ${
                isActive 
                  ? 'bg-[#181F33] text-[#CAAA98] font-bold border-l-4 border-[#CAAA98]' 
                  : 'text-gray-400 hover:bg-[#2C354E] hover:text-white'
              }`}
            >
              {({ isActive }) => (
                <>
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
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[#2C354E] p-3 space-y-2">
        <button
          onClick={openPersonasModal}
          className="w-full flex items-center hover:bg-[#2C354E] p-2 rounded-md transition-colors text-left text-xs text-gray-400 hover:text-white relative group cursor-pointer"
        >
          <Users size={18} className="shrink-0 text-[#CAAA98] group-hover:scale-110 transition-transform" />
          <span className={`ml-3 text-[10px] uppercase tracking-wider font-semibold ${isExpanded ? 'inline' : 'hidden'}`}>
            Trader Personas
          </span>
        </button>

        <div className="border-t border-[#2C354E]/50 my-1" />

        <div className="flex items-center justify-between p-1 rounded-lg">
          <div className="flex items-center">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-[#CAAA98] flex items-center justify-center text-white font-semibold text-xs uppercase animate-pulse">
                {(user?.username || 'Marcus')[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#202940] rounded-full" />
            </div>

            <div className={`ml-3 transition-opacity duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
              <div className="text-[11px] font-bold text-gray-200 whitespace-nowrap">{user?.username || 'Marcus Vance'}</div>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                {user?.plan || 'PRO PLAN'}
              </span>
            </div>
          </div>

          {isExpanded && (
            <button
              onClick={async () => {
                try {
                  const { signOut } = await import('firebase/auth');
                  const { auth } = await import('../../lib/firebase/firebase');
                  await signOut(auth);
                } catch (e) {
                  console.error("Firebase signOut exception:", e);
                }
                clearAuth();
                navigate('/login');
              }}
              title="Sign Out"
              className="text-gray-400 hover:text-red-400 p-1.5 rounded transition-colors hover:bg-slate-800 cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

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
    </>
  );
};

export default Sidebar;
