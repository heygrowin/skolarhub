import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Country } from '../types';
import { getCountries } from '../services/countryService';
import { useAuth } from './AuthContext';

interface CountryContextType {
  countries: Country[];
  loading: boolean;
  selectedCountryFilter: string; // 'ALL' or country code 'IT', 'MN'
  setSelectedCountryFilter: (code: string) => void;
  refreshCountries: () => Promise<void>;
  getCountryName: (code: string) => string;
  getCountryFlag: (code: string) => string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  const { userProfile, canAccessCountry } = useAuth();

  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCountries();
      setCountries(list);
    } catch (err) {
      console.error("Error loading countries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // If user is restricted to a specific country (e.g. Counsellor for Italy), automatically set filter
  useEffect(() => {
    if (userProfile && userProfile.assignedCountries && !userProfile.assignedCountries.includes('*')) {
      if (userProfile.assignedCountries.length > 0) {
        setSelectedCountryFilter(userProfile.assignedCountries[0]);
      }
    }
  }, [userProfile]);

  const getCountryName = useCallback((code: string): string => {
    const c = countries.find(item => item.code === code);
    return c ? c.name : code;
  }, [countries]);

  const getCountryFlag = useCallback((code: string): string => {
    const c = countries.find(item => item.code === code);
    return c ? c.flag : '🌐';
  }, [countries]);

  // Filter countries according to user permission
  const accessibleCountries = countries.filter(c => canAccessCountry(c.code));

  return (
    <CountryContext.Provider
      value={{
        countries: accessibleCountries,
        loading,
        selectedCountryFilter,
        setSelectedCountryFilter,
        refreshCountries: loadCountries,
        getCountryName,
        getCountryFlag,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export function useCountry(): CountryContextType {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}

