import React, { useState, useRef, useEffect } from 'react';
import { Menu, Globe, Plus, Calendar, Check, ChevronDown } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';
import { useYear } from '../../context/YearContext';
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
  const { years, selectedYearFilter, setSelectedYearFilter, addCustomYear } = useYear();

  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const yearMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target as Node)) {
        setYearMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearInput.trim();
    if (!trimmed) return;
    await addCustomYear(trimmed);
    setSelectedYearFilter(trimmed);
    setNewYearInput('');
    setYearMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 text-navy-900 hover:bg-slate-100 lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">SKOLAR</span>
            <span className="text-xs text-slate-300 hidden sm:inline">/</span>
            <h1 className="text-lg font-bold text-navy-950 tracking-tight capitalize truncate">
              {currentSectionTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Right: Top-Side Year Selector Button, Country Filter, Quick Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Intake Year Button & Interactive Picker */}
        <div className="relative" ref={yearMenuRef}>
          <button
            type="button"
            onClick={() => setYearMenuOpen(!yearMenuOpen)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
              selectedYearFilter !== 'ALL'
                ? 'bg-gold-500 text-navy-950 border-gold-500 shadow-sm'
                : 'bg-slate-100/80 hover:bg-slate-100 text-navy-950 border-slate-200/60'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${selectedYearFilter !== 'ALL' ? 'text-navy-950' : 'text-gold-600'}`} />
            <span>{selectedYearFilter === 'ALL' ? 'All Years' : `Year ${selectedYearFilter}`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${yearMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {yearMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200/90 shadow-elevated p-2 z-50 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Filter Workspace by Year
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedYearFilter('ALL');
                  setYearMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors ${
                  selectedYearFilter === 'ALL'
                    ? 'bg-navy-950 text-gold-400 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <span>All Intake Years</span>
                {selectedYearFilter === 'ALL' && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1 border-t border-slate-100">
                {years.map((yr) => {
                  const active = selectedYearFilter === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYearFilter(yr);
                        setYearMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors ${
                        active
                          ? 'bg-gold-50 text-navy-950 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span>🎓 Intake {yr}</span>
                      {active && <Check className="w-3.5 h-3.5 text-gold-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Create Custom Year Inline */}
              <form onSubmit={handleAddYear} className="pt-2 mt-1 border-t border-slate-100 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="Add year (e.g. 2029)"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-gold-500"
                />
                <button
                  type="submit"
                  title="Add & Select Year"
                  className="p-1.5 rounded-lg bg-gold-500 text-navy-950 hover:bg-gold-400 font-bold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Country Filter Context */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200/60 transition-colors">
          <Globe className="w-4 h-4 text-navy-700 shrink-0" />
          <select
            value={selectedCountryFilter}
            onChange={(e) => setSelectedCountryFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-navy-950 focus:outline-none cursor-pointer pr-1"
          >
            <option value="ALL">All Countries</option>
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
