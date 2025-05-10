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

// Mock language options for settings page
const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  // Add more languages as needed
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [autoCloseInactiveTabs, setAutoCloseInactiveTabs] = useState(false);
  const [inactiveThreshold, setInactiveThreshold] = useState(30); // Default to 30 minutes
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [aiPreferences, setAiPreferences] = useState("");

  // Load settings from localStorage on component mount
  useEffect(() => {
    const storedSettings = localStorage.getItem('tabwise_settings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      setAutoCloseInactiveTabs(settings.autoCloseInactiveTabs ?? false);
      setInactiveThreshold(settings.inactiveThreshold ?? 30);
      setSelectedLanguage(settings.selectedLanguage ?? "en");
      setAiPreferences(settings.aiPreferences ?? "");
    }
  }, []);

  const handleSaveSettings = () => {
    const settings = {
      autoCloseInactiveTabs,
      inactiveThreshold,
      selectedLanguage,
      aiPreferences,
    };
    localStorage.setItem('tabwise_settings', JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Inactive Tab Management</CardTitle>
          <CardDescription>Configure how TabWise handles inactive tabs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="auto-close-tabs" className="flex flex-col space-y-1">
              <span>Automatically suggest closing inactive tabs</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Enable to receive AI-powered suggestions for closing tabs you haven't used.
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
                Inactive Threshold ({inactiveThreshold} minutes)
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
                Tabs inactive for longer than this duration will be considered for closure suggestions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Preferences</CardTitle>
          <CardDescription>Provide hints to the AI for better tab grouping and suggestions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="ai-preferences-input">User Preferences for AI</Label>
            <Input 
              id="ai-preferences-input"
              placeholder="e.g., 'Prioritize work-related tabs', 'Group social media separately'"
              value={aiPreferences}
              onChange={(e) => setAiPreferences(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              This text will be sent to the AI to help tailor its suggestions.
            </p>
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Choose your preferred language for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language-select">Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger id="language-select" className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             <p className="text-sm text-muted-foreground mt-1">
              Language selection is currently a placeholder and does not change the UI language.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>
    </div>
  );
}
