
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/lib/hooks/use-auth"
import { getUserProfile, saveUserSettings } from "@/lib/firebase/firestoreService"
import type { UserSettings } from "@/types/settings"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { setTheme: setNextTheme, theme: currentNextTheme } = useNextTheme(); // Get current theme state

  // Effect to load theme from user settings
  React.useEffect(() => {
    if (currentUser && !authLoading) {
      getUserProfile(currentUser.uid).then(profile => {
        if (profile?.settings?.theme) {
          if (profile.settings.theme !== currentNextTheme) { // Only set if different
            setNextTheme(profile.settings.theme);
          }
        }
      });
    }
  }, [currentUser, authLoading, setNextTheme, currentNextTheme]);

  // Effect to save theme to user settings when it changes via NextThemesProvider
  React.useEffect(() => {
    const originalSetTheme = props.setTheme || setNextTheme;
    
    const newSetTheme = async (themeValue: string) => {
      originalSetTheme(themeValue); // Call original setTheme from next-themes or provided prop
      if (currentUser && !authLoading) {
        const profile = await getUserProfile(currentUser.uid);
        const updatedSettings: UserSettings = {
          ...(profile?.settings || { // Default other settings if not present
            geminiApiKey: '',
            autoCloseInactiveTabs: false,
            inactiveThreshold: 30,
            aiPreferences: '',
            locale: 'en',
          }),
          theme: themeValue,
        };
        await saveUserSettings(currentUser.uid, updatedSettings);
      }
    };

    // If the ThemeProvider is used nested, this might be tricky.
    // For now, this assumes direct usage or that props.setTheme would handle persistence if provided.
    // A cleaner way might be to observe `theme` from `useNextTheme()` and persist that.
    
    // This effect monitors `currentNextTheme` to save it when it changes from any source
    // (e.g. ThemeToggle or system preference change if enableSystem is true)
    if (currentUser && !authLoading && currentNextTheme && props.enableSystem) { // ensure theme is defined
        getUserProfile(currentUser.uid).then(async profile => {
            const currentDbTheme = profile?.settings?.theme;
            if (currentDbTheme !== currentNextTheme) {
                 const updatedSettings: UserSettings = {
                    ...(profile?.settings || {
                        geminiApiKey: '',
                        autoCloseInactiveTabs: false,
                        inactiveThreshold: 30,
                        aiPreferences: '',
                        locale: 'en',
                    }),
                    theme: currentNextTheme,
                };
                await saveUserSettings(currentUser.uid, updatedSettings);
            }
        });
    }


  }, [props.setTheme, currentUser, authLoading, currentNextTheme, props.enableSystem, setNextTheme]);


  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
