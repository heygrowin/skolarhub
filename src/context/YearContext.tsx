import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCustomOptionsForCategory, saveCustomOption } from '../services/customOptionService';
import { useAuth } from './AuthContext';

export const BASELINE_INTAKE_YEARS = ['2024', '2025', '2026', '2027', '2028'];

interface YearContextType {
  years: string[];
  selectedYearFilter: string; // 'ALL' or '2025', '2026', etc.
  setSelectedYearFilter: (year: string) => void;
  addCustomYear: (year: string) => Promise<void>;
  refreshYears: (extraYears?: string[]) => Promise<void>;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [years, setYears] = useState<string[]>(BASELINE_INTAKE_YEARS);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');

  const refreshYears = useCallback(async (extraYears: string[] = []) => {
    const customYears = await getCustomOptionsForCategory('intake_years');
    const merged = Array.from(
      new Set([...BASELINE_INTAKE_YEARS, ...customYears, ...extraYears].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    setYears(merged);
  }, []);

  useEffect(() => {
    if (userProfile) {
      refreshYears();
    }
  }, [userProfile, refreshYears]);

  useEffect(() => {
    const handleSync = () => {
      refreshYears();
    };
    window.addEventListener('skolar_custom_options_updated', handleSync);
    return () => window.removeEventListener('skolar_custom_options_updated', handleSync);
  }, [refreshYears]);

  const addCustomYear = useCallback(async (year: string) => {
    const trimmed = year.trim();
    if (!trimmed) return;
    await saveCustomOption('intake_years', trimmed);
    await refreshYears([trimmed]);
    window.dispatchEvent(new CustomEvent('skolar_custom_options_updated', { detail: { categoryKey: 'intake_years' } }));
  }, [refreshYears]);

  return (
    <YearContext.Provider
      value={{
        years,
        selectedYearFilter,
        setSelectedYearFilter,
        addCustomYear,
        refreshYears,
      }}
    >
      {children}
    </YearContext.Provider>
  );
};

export function useYear(): YearContextType {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}

