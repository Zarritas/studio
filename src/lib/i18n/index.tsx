"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, options?: Record<string, string | number | undefined> & { defaultValue?: string }) => string;
  supportedLocales: { code: string; name: string }[];
  isLoadingTranslations: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const supportedLocales = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  // Add more languages here
];
export const defaultLocale = "en";
const LOCALE_STORAGE_KEY = "tabwise_locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, _setLocale] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCALE_STORAGE_KEY) || defaultLocale;
    }
    return defaultLocale;
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    if (supportedLocales.some(l => l.code === newLocale)) {
      _setLocale(newLocale);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      }
    }
  }, []); // _setLocale is stable and doesn't need to be in dependencies

  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoadingTranslations(true);
      try {
        const module = await import(`@/locales/${locale}.json`);
        setTranslations(module.default || module);
      } catch (error) {
        console.error(`Could not load translations for locale: ${locale}`, error);
        if (locale !== defaultLocale) {
          try {
            const module = await import(`@/locales/${defaultLocale}.json`);
            setTranslations(module.default || module);
          } catch (defaultError) {
            console.error(`Could not load default translations for locale: ${defaultLocale}`, defaultError);
            setTranslations({});
          }
        } else {
          setTranslations({});
        }
      }
      setIsLoadingTranslations(false);
    };

    if (hasMounted) {
      loadTranslations();
    }
  }, [locale, hasMounted]);

  const t = useCallback((key: string, options?: Record<string, string | number | undefined> & { defaultValue?: string }): string => {
    let message = translations[key];
    
    if (message === undefined) {
      message = options?.defaultValue || key;
    }
  
    if (options) {
      const replaceValues: Record<string, string | number> = {};
      for (const optKey in options) {
        if (optKey !== 'defaultValue' && options[optKey] !== undefined) {
          replaceValues[optKey] = options[optKey] as string | number;
        }
      }
  
      Object.keys(replaceValues).forEach(placeholder => {
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\{${escapedPlaceholder}\\}`, 'g');
        message = message.replace(regex, String(replaceValues[placeholder]));
      });
    }
    return message;
  }, [translations]);

  if (!hasMounted) {
    // Render children with isLoadingTranslations: true to match server behavior
    // and avoid client-side only loading UI during initial render.
    // The `t` function will use defaults or keys during this phase.
    return (
      <LocaleContext.Provider value={{ locale, setLocale, t, supportedLocales, isLoadingTranslations: true }}>
        {children}
      </LocaleContext.Provider>
    );
  }

  // After mounting, if translations are still loading, show client-side loading indicator.
  if (isLoadingTranslations) {
     return (
        <LocaleContext.Provider value={{ locale, setLocale, t, supportedLocales, isLoadingTranslations: true }}>
            <div className="flex items-center justify-center min-h-screen">Loading translations...</div>
        </LocaleContext.Provider>
     );
  }

  // Translations loaded and component has mounted.
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, supportedLocales, isLoadingTranslations: false }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
