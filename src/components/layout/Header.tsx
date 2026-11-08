import React from 'react';
import { Menu, Globe, Plus, Bell, Shield } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

interface HeaderProps {
  currentSectionTitle: string;
  onOpenMobileMenu: () => void;
  onOpenQuickAction: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSectionTitle,
  onOpenMobileMenu,
  onOpenQuickAction,
}) => {
  const { countries, selectedCountryFilter, setSelectedCountryFilter } = useCountry();
  const { userProfile, isSimulated } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 text-navy-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">SKOLAR</span>
            <span className="text-xs text-slate-300 hidden sm:inline">/</span>
            <h1 className="text-lg font-bold text-navy-950 tracking-tight capitalize">
              {currentSectionTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Right: Country Filter, Quick Action, Alerts */}
      <div className="flex items-center gap-3">
        {/* Country Filter Context */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200/60 transition-colors">
          <Globe className="w-4 h-4 text-navy-700 shrink-0" />
          <select
            value={selectedCountryFilter}
            onChange={(e) => setSelectedCountryFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-navy-950 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">🌐 All Countries</option>
            {countries.map((c) => (
              <option key={c.id} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Action Button */}
        <Button
          variant="gold"
          size="sm"
          onClick={onOpenQuickAction}
          icon={<Plus className="w-4 h-4" />}
          className="hidden sm:inline-flex"
        >
          Quick Action
        </Button>
      </div>
    </header>
  );
};

