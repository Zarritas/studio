
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import { KeyRound, Loader2 } from 'lucide-react';
import { validateApiKey } from '@/ai/flows/validate-api-key-flow';
import { useAuth } from '@/lib/hooks/use-auth';
import { getUserProfile, saveUserSettings } from '@/lib/firebase/firestoreService';
import type { UserSettings } from '@/types/settings';
import { ThemeToggle } from '@/components/theme-toggle'; // For theme setting

const defaultSettings: UserSettings = {
  autoCloseInactiveTabs: false,
  inactiveThreshold: 30,
  aiPreferences: "",
  geminiApiKey: "",
  initialGeminiApiKey: "", // This is not part of UserSettings in DB
  locale: "en",
  theme: "system",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { locale, setLocale: setGlobalLocale, supportedLocales, t } = useTranslation();
  const { currentUser, isLoading: authLoading } = useAuth();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [initialGeminiApiKey, setInitialGeminiApiKey] = useState(""); // Used to track changes for validation
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from Firestore on component mount or when user changes
  useEffect(() => {
    if (currentUser && !authLoading) {
      setIsLoadingSettings(true);
      getUserProfile(currentUser.uid).then(profile => {
        if (profile?.settings) {
          setSettings(profile.settings);
          setInitialGeminiApiKey(profile.settings.geminiApiKey || "");
          if (profile.settings.locale && profile.settings.locale !== locale) {
            setGlobalLocale(profile.settings.locale); // Sync global locale
          }
        } else {
          // No settings found, use defaults (already set in useState)
          // Optionally save default settings to Firestore here for new users
          saveUserSettings(currentUser.uid, defaultSettings);
        }
        setIsLoadingSettings(false);
      }).catch(err => {
        console.error("Failed to load settings:", err);
        toast({ title: t("error"), description: "Failed to load your settings.", variant: "destructive" });
        setIsLoadingSettings(false);
      });
    } else if (!authLoading) {
      // No user, reset to defaults or handle as appropriate
      setSettings(defaultSettings);
      setIsLoadingSettings(false);
    }
  }, [currentUser, authLoading, toast, t, locale, setGlobalLocale]);

  const handleSettingChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleLocaleChange = (newLocale: string) => {
    handleSettingChange('locale', newLocale);
    setGlobalLocale(newLocale); // Update global context immediately
  };

  const handleSaveSettings = async () => {
    if (!currentUser) {
      toast({ title: t("error"), description: "You must be logged in to save settings.", variant: "destructive" });
      return;
    }

    let apiKeyToSave = settings.geminiApiKey;
    let newApiKeySuccessfullyVerified = false;

    if (settings.geminiApiKey && settings.geminiApiKey !== initialGeminiApiKey) {
      setIsVerifyingApiKey(true);
      try {
        const validationResult = await validateApiKey({ apiKey: settings.geminiApiKey });
        if (validationResult.isValid) {
          // apiKeyToSave is already set to settings.geminiApiKey
          newApiKeySuccessfullyVerified = true;
          toast({
            title: t("apiKeyVerifiedTitle"),
            description: t("apiKeyVerifiedDesc"),
            variant: "default", 
          });
        } else {
          apiKeyToSave = initialGeminiApiKey; // Revert to old key if new one is invalid
          toast({
            title: t("apiKeyInvalidTitle"),
            description: validationResult.error || t("apiKeyInvalidDesc"),
            variant: "destructive",
          });
        }
      } catch (error) {
        apiKeyToSave = initialGeminiApiKey; // Revert on verification error
        toast({
          title: t("apiKeyVerificationErrorTitle"),
          description: (error as Error).message || t("apiKeyVerificationErrorDesc"),
          variant: "destructive",
        });
      } finally {
        setIsVerifyingApiKey(false);
      }
    } else if (!settings.geminiApiKey && settings.geminiApiKey !== initialGeminiApiKey) { 
      apiKeyToSave = ""; 
    }
    
    const settingsToSave: UserSettings = { ...settings, geminiApiKey: apiKeyToSave };

    const success = await saveUserSettings(currentUser.uid, settingsToSave);
    
    if (success) {
      setSettings(settingsToSave); // Update local state with potentially reverted API key
      setInitialGeminiApiKey(apiKeyToSave); // Update initial key state
      if (!settings.geminiApiKey || settings.geminiApiKey === initialGeminiApiKey || newApiKeySuccessfullyVerified) {
        toast({
            title: t("settingsSaved"),
            description: t("settingsSavedDesc"),
        });
      }
    } else {
      toast({ title: t("error"), description: "Failed to save settings.", variant: "destructive" });
    }
  };

  if (authLoading || isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">{t('loadingSettings', {defaultValue: "Loading settings..."})}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t("settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("inactiveTabManagement")}</CardTitle>
          <CardDescription>{t("inactiveTabManagementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="auto-close-tabs" className="flex flex-col space-y-1">
              <span>{t("autoSuggestCloseInactive")}</span>
              <span className="font-normal leading-snug text-muted-foreground">
                {t("autoSuggestCloseInactiveDesc")}
              </span>
            </Label>
            <Switch
              id="auto-close-tabs"
              checked={settings.autoCloseInactiveTabs}
              onCheckedChange={(value) => handleSettingChange('autoCloseInactiveTabs', value)}
              disabled={isVerifyingApiKey}
            />
          </div>
          
          {settings.autoCloseInactiveTabs && (
            <div className="space-y-2 p-4 border rounded-lg">
              <Label htmlFor="inactive-threshold">
                {t("inactiveThreshold", { threshold: settings.inactiveThreshold })}
              </Label>
              <Slider
                id="inactive-threshold"
                min={5}
                max={120}
                step={5}
                value={[settings.inactiveThreshold]}
                onValueChange={(value) => handleSettingChange('inactiveThreshold', value[0])}
                className="my-2"
                disabled={isVerifyingApiKey}
              />
              <p className="text-sm text-muted-foreground">
                {t("inactiveThresholdDesc")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("aiPreferences")}</CardTitle>
          <CardDescription>{t("aiPreferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="ai-preferences-input">{t("userPreferencesForAI")}</Label>
            <Input 
              id="ai-preferences-input"
              placeholder={t("userPreferencesForAIPlaceholder")}
              value={settings.aiPreferences}
              onChange={(e) => handleSettingChange('aiPreferences', e.target.value)}
              disabled={isVerifyingApiKey}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t("userPreferencesForAIDesc")}
            </p>
           </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            <div>
                <CardTitle>{t("apiKeyManagement")}</CardTitle>
                <CardDescription>{t("apiKeyManagementDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="gemini-api-key-input">{t("geminiApiKeyLabel")}</Label>
            <Input 
              id="gemini-api-key-input"
              type="password"
              placeholder={t("geminiApiKeyPlaceholder")}
              value={settings.geminiApiKey}
              onChange={(e) => handleSettingChange('geminiApiKey', e.target.value)}
              disabled={isVerifyingApiKey}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t("geminiApiKeyDesc")}
            </p>
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("localizationAndTheme")}</CardTitle>
          <CardDescription>{t("localizationAndThemeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="language-select">{t("language")}</Label>
            <Select value={settings.locale} onValueChange={handleLocaleChange} disabled={isVerifyingApiKey}>
              <SelectTrigger id="language-select" className="w-[180px]">
                <SelectValue placeholder={t("selectLanguage")} />
              </SelectTrigger>
              <SelectContent>
                {supportedLocales.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {t(`language.${lang.code}`, {defaultValue: lang.name})}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
             <Label>{t("theme")}</Label>
             <div className='pt-2'>
                <ThemeToggle />
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isVerifyingApiKey || isLoadingSettings}>
          {isVerifyingApiKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isVerifyingApiKey ? t("verifyingApiKeyButtonText", { defaultValue: "Verifying..."}) : t("saveSettings")}
        </Button>
      </div>
    </div>
  );
}

