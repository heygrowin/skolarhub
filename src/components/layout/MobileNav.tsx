import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Coins, 
  MoreHorizontal 
} from 'lucide-react';
import { NavigationSection } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  onOpenFullMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentSection,
  onSelectSection,
  onOpenFullMenu,
}) => {
  const { canAccessModule } = useAuth();

  const primaryMobileItems: { id: NavigationSection; label: string; icon: React.ReactNode; module: string }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" />, module: 'dashboard' },
    { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" />, module: 'students' },
    { id: 'applications', label: 'Apps', icon: <GraduationCap className="w-5 h-5" />, module: 'applications' },
    { id: 'finance', label: 'Finance', icon: <Coins className="w-5 h-5" />, module: 'finance' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md lg:hidden">
      {primaryMobileItems.map((item) => {
        if (!canAccessModule(item.module)) return null;
        const isActive = currentSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectSection(item.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              isActive ? 'text-navy-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${isActive ? 'bg-gold-400/20 text-gold-600' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / More Button */}
      <button
        onClick={onOpenFullMenu}
        className="flex flex-col items-center justify-center w-14 py-1 text-slate-400 font-medium hover:text-navy-900"
      >
        <div className="p-1 rounded-xl">
          <MoreHorizontal className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};

