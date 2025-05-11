
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth'; // To access user for locale preference
import { getUserProfile, saveUserSettings } from '@/lib/firebase/firestoreService'; // To save locale preference
import type { UserSettings } from '@/types/settings';

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
];
export const defaultLocale = "en";
const LOCALE_STORAGE_KEY = "tabwise_locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const [currentLocale, _setLocale] = useState<string>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Initial locale from localStorage, to prevent flash before Firestore settings load
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale && supportedLocales.some(l => l.code === storedLocale)) {
      _setLocale(storedLocale);
    }
  }, []);

  // Effect to load locale from user settings once user is available
  useEffect(() => {
    if (hasMounted && currentUser && !authIsLoading) {
      getUserProfile(currentUser.uid).then(profile => {
        if (profile?.settings?.locale && supportedLocales.some(l => l.code === profile.settings.locale)) {
          if (profile.settings.locale !== currentLocale) {
             _setLocale(profile.settings.locale);
          }
        }
        // Translations will be loaded by the next effect based on currentLocale
      });
    }
  }, [currentUser, authIsLoading, hasMounted, currentLocale]);


  const setLocale = useCallback(async (newLocale: string) => {
    if (supportedLocales.some(l => l.code === newLocale)) {
      _setLocale(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      if (currentUser) {
        // Save to Firestore
        const profile = await getUserProfile(currentUser.uid);
        const updatedSettings: UserSettings = {
          ...(profile?.settings || {
            // Provide defaults if settings don't exist
            geminiApiKey: '',
            autoCloseInactiveTabs: false,
            inactiveThreshold: 30,
            aiPreferences: '',
            theme: 'system',
          }),
          locale: newLocale,
        };
        await saveUserSettings(currentUser.uid, updatedSettings);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const loadTranslations = async () => {
      if (!currentLocale) return; // Don't load if locale isn't set
      setIsLoadingTranslations(true);
      try {
        const module = await import(`@/locales/${currentLocale}.json`);
        setTranslations(module.default || module);
      } catch (error) {
        console.error(`Could not load translations for locale: ${currentLocale}`, error);
        if (currentLocale !== defaultLocale) {
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
  }, [currentLocale, hasMounted]);

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

  const providerValue = {
    locale: currentLocale,
    setLocale,
    t,
    supportedLocales,
    isLoadingTranslations,
  };
  
  if (!hasMounted || (authIsLoading && !currentUser)) {
    // Still waiting for mount or auth state to settle, show basic loading or nothing
    // to avoid hydration errors. The `t` function will use defaults or keys.
     return (
        <LocaleContext.Provider value={{ ...providerValue, isLoadingTranslations: true }}>
           {/* Minimal loading UI, or children directly if preferred to avoid layout shift */}
           {/* <div className="flex items-center justify-center min-h-screen">Loading locale...</div> */}
           {children}
        </LocaleContext.Provider>
     );
  }

  if (isLoadingTranslations) {
     return (
        <LocaleContext.Provider value={{ ...providerValue, isLoadingTranslations: true }}>
            <div className="flex items-center justify-center min-h-screen">Loading translations...</div>
        </LocaleContext.Provider>
     );
  }

  return (
    <LocaleContext.Provider value={providerValue}>
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
