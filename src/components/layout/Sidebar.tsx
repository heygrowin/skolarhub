import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Globe2, 
  Handshake, 
  Coins, 
  FolderLock, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export type NavigationSection = 
  | 'dashboard'
  | 'students'
  | 'applications'
  | 'countries'
  | 'partners'
  | 'finance'
  | 'documents'
  | 'team'
  | 'settings';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { userProfile, logout, canAccessModule, switchSimulatedRole } = useAuth();

  const navItems: { id: NavigationSection; label: string; icon: React.ReactNode; moduleKey: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, moduleKey: 'dashboard' },
    { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" />, moduleKey: 'students' },
    { id: 'applications', label: 'Applications', icon: <GraduationCap className="w-5 h-5" />, moduleKey: 'applications' },
    { id: 'countries', label: 'Countries', icon: <Globe2 className="w-5 h-5" />, moduleKey: 'countries' },
    { id: 'partners', label: 'B2B Partners', icon: <Handshake className="w-5 h-5" />, moduleKey: 'partners' },
    { id: 'finance', label: 'Finance', icon: <Coins className="w-5 h-5" />, moduleKey: 'finance' },
    { id: 'documents', label: 'Documents', icon: <FolderLock className="w-5 h-5" />, moduleKey: 'documents' },
    { id: 'team', label: 'Team & Access', icon: <ShieldCheck className="w-5 h-5" />, moduleKey: 'team' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, moduleKey: 'settings' },
  ];

  // Filter based on permission
  const allowedNavItems = navItems.filter(item => canAccessModule(item.moduleKey));

  const roleLabels: Record<string, { label: string; variant: 'gold' | 'green' | 'blue' | 'purple' | 'navy' }> = {
    super_admin: { label: 'Super Admin', variant: 'gold' },
    admin: { label: 'Admin', variant: 'purple' },
    manager: { label: 'Manager', variant: 'blue' },
    counsellor: { label: 'Counsellor', variant: 'green' },
    finance: { label: 'Finance Officer', variant: 'gold' },
    custom: { label: 'Custom Team', variant: 'navy' },
  };

  const currentRoleInfo = roleLabels[userProfile?.role || 'counsellor'] || { label: 'Team Member', variant: 'navy' };

  const handleNavClick = (id: NavigationSection) => {
    onSelectSection(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-deep-navy text-white flex flex-col justify-between border-r border-navy-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
          <img
            src="/logo-white.png"
            alt="SKOLAR"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              // Fallback text if logo fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold tracking-wider text-white">SKOLAR</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400 bg-gold-400/10 px-1.5 py-0.5 rounded border border-gold-400/20">HQ</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">CONTROL CENTER</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-4 space-y-1">
          {allowedNavItems.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-navy-800 to-navy-700/80 text-white border-l-4 border-gold-400 shadow-soft'
                    : 'text-slate-400 hover:text-white hover:bg-navy-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-gold-400' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-gold-400" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Role Switcher */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/60">
        {/* Quick Role Persona Switcher for Evaluation */}
        <div className="mb-3 px-2 py-2 rounded-xl bg-navy-900/90 border border-navy-700/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gold-400" />
              Role Simulator
            </span>
          </div>
          <select
            value={userProfile?.role || 'super_admin'}
            onChange={(e) => switchSimulatedRole(e.target.value as any)}
            className="w-full bg-deep-navy border border-navy-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold-400"
          >
            <option value="super_admin">👑 Super Admin (Full Access)</option>
            <option value="counsellor">🎓 Counsellor (Italy only)</option>
            <option value="finance">💰 Finance Officer</option>
            <option value="manager">📋 Admissions Manager</option>
          </select>
        </div>

        {/* User Info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-300 font-bold text-xs shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userProfile?.displayName || 'Administrator'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={currentRoleInfo.variant} size="sm">
                  {currentRoleInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

