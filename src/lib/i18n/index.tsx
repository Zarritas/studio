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

  const setLocale = useCallback((newLocale: string) => {
    if (supportedLocales.some(l => l.code === newLocale)) {
      _setLocale(newLocale);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      }
    }
  }, [_setLocale]);

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

    loadTranslations();
  }, [locale]);

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
        // Ensure placeholder is a valid regex string
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\{${escapedPlaceholder}\\}`, 'g');
        message = message.replace(regex, String(replaceValues[placeholder]));
      });
    }
    return message;
  }, [translations]);

  if (isLoadingTranslations && typeof window !== 'undefined') {
    // Avoid rendering children until translations are loaded on client to prevent hydration mismatch
    // For SSR, this might need a different strategy or initial props.
    // This basic loading state prevents content flash with untranslated keys.
     return <div className="flex items-center justify-center min-h-screen">Loading translations...</div>;
  }


  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, supportedLocales, isLoadingTranslations }}>
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
