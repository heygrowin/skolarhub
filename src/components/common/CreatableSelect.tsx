import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Check, X, Search } from 'lucide-react';
import {
  getCustomOptionsForCategory,
  saveCustomOption,
  removeCustomOption
} from '../../services/customOptionService';

export interface CreatableOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface CreatableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  categoryKey: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  value,
  onChange,
  options: defaultOptions,
  categoryKey,
  placeholder = 'Select or type to add...',
  required = false,
  disabled = false,
  className = '',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load custom options from fast localStorage + Cloud Firestore
  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem(`skolar_custom_options_${categoryKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCustomOptions(parsed);
      }
    } catch {}

    getCustomOptionsForCategory(categoryKey).then((opts) => {
      if (active && Array.isArray(opts)) {
        setCustomOptions(opts);
      }
    });

    const handleExternalUpdate = (e: any) => {
      if (!e?.detail?.categoryKey || e.detail.categoryKey === categoryKey) {
        try {
          const saved = localStorage.getItem(`skolar_custom_options_${categoryKey}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setCustomOptions(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('skolar_custom_options_updated', handleExternalUpdate);

    return () => {
      active = false;
      window.removeEventListener('skolar_custom_options_updated', handleExternalUpdate);
    };
  }, [categoryKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize all options into CreatableOption objects
  const normalizedDefaultOptions: CreatableOption[] = defaultOptions.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt, isCustom: false } : { ...opt, isCustom: false }
  );

  const normalizedCustomOptions: CreatableOption[] = customOptions
    .filter((c) => !normalizedDefaultOptions.some((d) => d.value.toLowerCase() === c.toLowerCase()))
    .map((c) => ({ value: c, label: c, isCustom: true }));

  const allOptions: CreatableOption[] = [...normalizedDefaultOptions, ...normalizedCustomOptions];

  if (value && !allOptions.some((o) => o.value === value)) {
    allOptions.unshift({ value, label: value, isCustom: true });
  }

  const filteredOptions = allOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const exactMatchExists = allOptions.some(
    (opt) =>
      opt.value.toLowerCase().trim() === searchQuery.toLowerCase().trim() ||
      opt.label.toLowerCase().trim() === searchQuery.toLowerCase().trim()
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const updated = Array.from(new Set([...customOptions, trimmed]));
    setCustomOptions(updated);
    onChange(trimmed);
    setIsOpen(false);
    setSearchQuery('');

    await saveCustomOption(categoryKey, trimmed);
    window.dispatchEvent(new CustomEvent('skolar_custom_options_updated', { detail: { categoryKey } }));
  };

  const handleDeleteCustomOption = async (e: React.MouseEvent, optValue: string) => {
    e.stopPropagation();
    const updated = customOptions.filter((c) => c !== optValue);
    setCustomOptions(updated);

    if (value === optValue) {
      onChange(allOptions.find((o) => o.value !== optValue)?.value || '');
    }

    await removeCustomOption(categoryKey, optValue);
    window.dispatchEvent(new CustomEvent('skolar_custom_options_updated', { detail: { categoryKey } }));
  };

  const selectedOption = allOptions.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl border bg-white transition-all cursor-pointer select-none ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-gold-500 ring-2 ring-gold-400/20 shadow-sm'
            : 'border-slate-300 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <span className={`truncate font-medium ${selectedOption ? 'text-navy-950' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[220px] bg-white rounded-2xl border border-slate-200/90 shadow-elevated overflow-hidden">
          {/* Search & Custom Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!exactMatchExists && searchQuery.trim()) {
                      handleCreateNew();
                    } else if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0].value);
                    }
                  }
                }}
                placeholder="Filter or type custom option..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-400"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-gold-50/80 text-navy-950 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-navy-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-normal shrink-0">
                          Saved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-gold-600 shrink-0" />}
                      {opt.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomOption(e, opt.value)}
                          title="Remove custom option"
                          className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching options — type above to create new
              </div>
            )}

            {/* Create Custom Action Button */}
            {searchQuery.trim() !== '' && !exactMatchExists && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 p-2.5 mt-1 text-xs font-semibold text-gold-900 bg-gold-50 hover:bg-gold-100 rounded-xl cursor-pointer transition-colors border border-gold-300/70 text-left"
              >
                <Plus className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span className="truncate">
                  Create & save: <strong className="text-navy-950">"{searchQuery.trim()}"</strong>
                </span>
              </button>
            )}

            {/* Quick guide when user has not typed yet */}
            {searchQuery.trim() === '' && (
              <div className="px-2.5 py-1.5 text-[10px] text-slate-400 flex items-center gap-1 border-t border-slate-100 mt-1">
                <Plus className="w-3 h-3 text-gold-500 shrink-0" />
                <span>Type above to create & save a new option permanently</span>
              </div>
            )}
          </div>
        </div>
      )}

      {helperText && <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
