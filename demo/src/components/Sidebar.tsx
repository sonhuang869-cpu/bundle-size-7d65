import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle,
  GitMerge, Upload, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/reconciliations', icon: GitMerge, label: 'Reconciliations' },
  { to: '/workspace', icon: ArrowLeftRight, label: 'Workspace' },
  { to: '/exceptions', icon: AlertTriangle, label: 'Exceptions' },
  { to: '/import', icon: Upload, label: 'Data Import' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col bg-[#0d0d1a] border-r border-[#1e1e30] z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#1e1e30]">
        <div className="w-7 h-7 rounded-lg bg-[#7c3aed] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <rect x="2" y="6" width="6" height="2" fill="white" rx="0.5" />
            <rect x="2" y="10" width="8" height="2" fill="white" rx="0.5" />
            <rect x="2" y="14" width="4" height="2" fill="white" rx="0.5" />
            <path d="M12 4l5 6-5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight tracking-tight">ReconTrace</div>
          <div className="text-[10px] text-[#5a5a78] leading-tight">Reconciliation Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-[#5a5a78] uppercase tracking-widest px-2 mb-2">Operations</div>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-[#7c3aed]/15 text-white'
                : 'text-[#9898b0] hover:text-white hover:bg-[#1a1a2e]'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-[#7c3aed]' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} className="text-[#7c3aed]" />}
              </>
            )}
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold text-[#5a5a78] uppercase tracking-widest px-2 mt-5 mb-2">System</div>
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
            isActive ? 'bg-[#7c3aed]/15 text-white' : 'text-[#9898b0] hover:text-white hover:bg-[#1a1a2e]'
          )}
        >
          <Settings size={15} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-[#1e1e30]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[#1a1a2e] cursor-pointer transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#059669] flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold">
            HM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Henry Muchori</div>
            <div className="text-[10px] text-[#5a5a78] truncate">Sr. Financial Operations</div>
          </div>
          <LogOut size={13} className="text-[#5a5a78] group-hover:text-[#9898b0] flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
