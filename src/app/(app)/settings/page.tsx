
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

export default function SettingsPage() {
  const { toast } = useToast();
  const { locale, setLocale, supportedLocales, t } = useTranslation();
  
  const [autoCloseInactiveTabs, setAutoCloseInactiveTabs] = useState(false);
  const [inactiveThreshold, setInactiveThreshold] = useState(30); // Default to 30 minutes
  const [aiPreferences, setAiPreferences] = useState("");

  // Load non-language settings from localStorage on component mount
  useEffect(() => {
    const storedSettings = localStorage.getItem('tabwise_app_settings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      setAutoCloseInactiveTabs(settings.autoCloseInactiveTabs ?? false);
      setInactiveThreshold(settings.inactiveThreshold ?? 30);
      setAiPreferences(settings.aiPreferences ?? "");
    }
  }, []);

  const handleSaveSettings = () => {
    const appSettings = {
      autoCloseInactiveTabs,
      inactiveThreshold,
      aiPreferences,
    };
    localStorage.setItem('tabwise_app_settings', JSON.stringify(appSettings));
    // Language is saved by LocaleProvider
    toast({
      title: t("settingsSaved"),
      description: t("settingsSavedDesc"),
    });
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
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t("userPreferencesForAIDesc")}
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
            <Select value={locale} onValueChange={setLocale}>
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
        <Button onClick={handleSaveSettings}>{t("saveSettings")}</Button>
      </div>
    </div>
  );
}
