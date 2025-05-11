
"use client";

import { useState, useEffect } from 'react';
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

export default function SettingsPage() {
  const { toast } = useToast();
  const { locale, setLocale, supportedLocales, t } = useTranslation();
  
  const [autoCloseInactiveTabs, setAutoCloseInactiveTabs] = useState(false);
  const [inactiveThreshold, setInactiveThreshold] = useState(30); // Default to 30 minutes
  const [aiPreferences, setAiPreferences] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [initialGeminiApiKey, setInitialGeminiApiKey] = useState(""); // Store initially loaded key
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);

  // Load non-language settings from localStorage on component mount
  useEffect(() => {
    const storedSettings = localStorage.getItem('tabwise_app_settings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      setAutoCloseInactiveTabs(settings.autoCloseInactiveTabs ?? false);
      setInactiveThreshold(settings.inactiveThreshold ?? 30);
      setAiPreferences(settings.aiPreferences ?? "");
      setGeminiApiKey(settings.geminiApiKey ?? "");
      setInitialGeminiApiKey(settings.geminiApiKey ?? "");
    }
  }, []);

  const handleSaveSettings = async () => {
    let apiKeyToSaveInStorage = initialGeminiApiKey;
    let newApiKeySuccessfullyVerified = false;

    if (geminiApiKey && geminiApiKey !== initialGeminiApiKey) { // Key is present and changed
      setIsVerifyingApiKey(true);
      try {
        const validationResult = await validateApiKey({ apiKey: geminiApiKey });
        if (validationResult.isValid) {
          apiKeyToSaveInStorage = geminiApiKey; // API key is valid, prepare to save it
          newApiKeySuccessfullyVerified = true;
          toast({
            title: t("apiKeyVerifiedTitle"),
            description: t("apiKeyVerifiedDesc"),
            variant: "default", 
          });
        } else {
          // API key is invalid, show error, do not update apiKeyToSaveInStorage from initialGeminiApiKey
          toast({
            title: t("apiKeyInvalidTitle"),
            description: validationResult.error || t("apiKeyInvalidDesc"),
            variant: "destructive",
          });
        }
      } catch (error) {
        // Error during the validation call itself
        toast({
          title: t("apiKeyVerificationErrorTitle"),
          description: (error as Error).message || t("apiKeyVerificationErrorDesc"),
          variant: "destructive",
        });
        // Do not update apiKeyToSaveInStorage from initialGeminiApiKey
      } finally {
        setIsVerifyingApiKey(false);
      }
    } else if (!geminiApiKey && geminiApiKey !== initialGeminiApiKey) { // Key was cleared by the user
      apiKeyToSaveInStorage = ""; // Save an empty string for the key
    } else { // Key is unchanged or was initially empty and remains empty
       apiKeyToSaveInStorage = geminiApiKey; // Keep current state (could be empty or initial key)
    }
    
    const appSettings = {
      autoCloseInactiveTabs,
      inactiveThreshold,
      aiPreferences,
      geminiApiKey: apiKeyToSaveInStorage, // Save the determined API key
    };
    localStorage.setItem('tabwise_app_settings', JSON.stringify(appSettings));

    // Update initialGeminiApiKey if a new key was successfully verified and saved, or if it was cleared.
    if (newApiKeySuccessfullyVerified || apiKeyToSaveInStorage !== initialGeminiApiKey) {
      setInitialGeminiApiKey(apiKeyToSaveInStorage);
    }
    
    // General "settings saved" toast (if API key was invalid, this toast follows the invalid key toast)
    if (!geminiApiKey || geminiApiKey === initialGeminiApiKey || newApiKeySuccessfullyVerified) {
        toast({
            title: t("settingsSaved"),
            description: t("settingsSavedDesc"),
        });
    }
  };

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
              checked={autoCloseInactiveTabs}
              onCheckedChange={setAutoCloseInactiveTabs}
              disabled={isVerifyingApiKey}
            />
          </div>
          
          {autoCloseInactiveTabs && (
            <div className="space-y-2 p-4 border rounded-lg">
              <Label htmlFor="inactive-threshold">
                {t("inactiveThreshold", { threshold: inactiveThreshold })}
              </Label>
              <Slider
                id="inactive-threshold"
                min={5}
                max={120}
                step={5}
                value={[inactiveThreshold]}
                onValueChange={(value) => setInactiveThreshold(value[0])}
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
              value={aiPreferences}
              onChange={(e) => setAiPreferences(e.target.value)}
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
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
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
          <CardTitle>{t("localization")}</CardTitle>
          <CardDescription>{t("localizationDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language-select">{t("language")}</Label>
            <Select value={locale} onValueChange={setLocale} disabled={isVerifyingApiKey}>
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isVerifyingApiKey}>
          {isVerifyingApiKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isVerifyingApiKey ? t("verifyingApiKeyButtonText", { defaultValue: "Verifying..."}) : t("saveSettings")}
        </Button>
      </div>
    </div>
  );
}
