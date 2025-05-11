
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Tab, TabGroup as TabGroupType } from '@/types';
import { TabGroup, type DraggedTabInfo } from '@/components/dashboard/tab-group';
import { AddTabModal } from '@/components/dashboard/add-tab-modal';
import { CreateGroupModal } from '@/components/dashboard/create-group-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Zap, Lightbulb, Trash2, AlertTriangle, Layers3, KeyRound, Loader2 } from 'lucide-react';
import { suggestTabGroups, SuggestTabGroupsInput, SuggestTabGroupsOutput } from '@/ai/flows/suggest-tab-groups';
import { suggestInactiveTabsClosure, SuggestInactiveTabsClosureInput, SuggestInactiveTabsClosureOutput } from '@/ai/flows/suggest-inactive-tabs-closure';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { TabItem } from '@/components/dashboard/tab-item';
import { useTranslation } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/contexts/DashboardContext';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { getUserProfile, saveUserTabs, saveUserTabGroups, UserProfileData } from '@/lib/firebase/firestoreService';
import type { UserSettings } from '@/types/settings';

// Example initial tabs are now removed, will be loaded from Firestore
// const initialTabs: Tab[] = [ ... ];

function DashboardPageContent() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tabGroups, setTabGroups] = useState<TabGroupType[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For loading tabs/groups
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [isUngroupedDragOver, setIsUngroupedDragOver] = useState(false);
  const { registerAddTabsBatch, registerCreateGroupsWithTabsBatch } = useDashboardContext();
  // geminiApiKey and isApiKeyChecked will now come from userSettings
  
  const ungroupedTabs = tabs.filter(tab => !tabGroups.some(group => group.tabs.some(t => t.id === tab.id)));

  // Fetch user data (tabs, groups, settings) from Firestore
  useEffect(() => {
    if (currentUser && !authLoading) {
      setIsLoadingData(true);
      getUserProfile(currentUser.uid)
        .then(profile => {
          if (profile) {
            setTabs(profile.tabs || []);
            setTabGroups(profile.tabGroups || []);
            setUserSettings(profile.settings || null);
          } else {
            // New user or error, set empty state
            setTabs([]);
            setTabGroups([]);
            setUserSettings(null);
          }
          setIsLoadingData(false);
        })
        .catch(error => {
          console.error("Error fetching user profile:", error);
          toast({ title: t("error"), description: "Failed to load your data.", variant: "destructive" });
          setIsLoadingData(false);
        });
    } else if (!authLoading) {
      // No current user and auth is not loading (e.g., logged out)
      setIsLoadingData(false);
      setTabs([]);
      setTabGroups([]);
      setUserSettings(null);
    }
  }, [currentUser, authLoading, toast, t]);

  const persistTabs = async (newTabs: Tab[]) => {
    if (currentUser) {
      await saveUserTabs(currentUser.uid, newTabs);
    }
  };

  const persistTabGroups = async (newTabGroups: TabGroupType[]) => {
    if (currentUser) {
      await saveUserTabGroups(currentUser.uid, newTabGroups);
    }
  };
  
  const persistTabsAndGroups = async (newTabs: Tab[], newTabGroups: TabGroupType[]) => {
    if (currentUser) {
        const successTabs = await saveUserTabs(currentUser.uid, newTabs);
        const successGroups = await saveUserTabGroups(currentUser.uid, newTabGroups);
        if (!successTabs || !successGroups) {
            toast({ title: t("error"), description: "Failed to save some changes.", variant: "destructive"});
        }
    }
  }


  const handleSuggestTabGroups = async () => {
    if (!userSettings?.geminiApiKey) {
      toast({ title: t("apiKeyRequiredTitle"), description: t("apiKeyRequiredDesc"), variant: "destructive" });
      setAiSuggestionError(t("apiKeyRequiredTitle"));
      return;
    }

    setIsLoadingAI(true);
    setAiSuggestionError(null);

    if (ungroupedTabs.length === 0) {
      toast({ title: t("noUngroupedTabsToOrganize"), description: t("noUngroupedTabsToOrganizeDesc"), variant: "default" });
      setIsLoadingAI(false);
      return;
    }

    const existingGroupsForAI = tabGroups.map(group => ({
      groupName: group.name,
      tabUrls: group.tabs.map(t => t.url),
      isCustom: group.isCustom || false,
    }));

    try {
      const input: SuggestTabGroupsInput = { 
        ungroupedUrls: ungroupedTabs.map(t => t.url),
        existingGroups: existingGroupsForAI,
        targetLanguage: locale, 
      };
      const suggestedGroupsOutput: SuggestTabGroupsOutput = await suggestTabGroups(input);
      
      let nextTabGroupsState = [...tabGroups];
      let nextTabsState = [...tabs]; // Keep track of tabs if AI adds new ones (currently it doesn't directly)
      let newGroupsCreatedCount = 0;
      let groupsUpdatedCount = 0;

      const aiSuggestions = suggestedGroupsOutput.map((sg, index) => ({
          ...sg,
          processedTabs: sg.tabUrls.map(urlFromAI => {
            if (!urlFromAI || typeof urlFromAI !== 'string') return null;
      
            let schemedUrl = urlFromAI;
            if (!urlFromAI.startsWith('http://') && !urlFromAI.startsWith('https://')) {
              schemedUrl = `https://${urlFromAI}`;
            }
      
            const existingTab = nextTabsState.find(t => t.url === urlFromAI || t.url === schemedUrl);
            if (existingTab) return existingTab;
      
            // AI currently should only work with existing ungrouped tabs
            // If AI suggests a tab that doesn't exist in ungrouped, we ignore it for now, or log warning
            // For this iteration, AI works with existing ungrouped tab URLs.
            console.warn(`AI suggested a tab URL not found in current tabs: ${urlFromAI}`);
            return null; 
          }).filter(Boolean) as Tab[]
      }));
      
      aiSuggestions.forEach(suggestion => {
          if (suggestion.processedTabs.length === 0 && !suggestion.groupName) return;
          const existingGroupIndex = nextTabGroupsState.findIndex(g => g.name === suggestion.groupName);

          if (existingGroupIndex !== -1) { 
              const groupToUpdate = nextTabGroupsState[existingGroupIndex];
              const currentTabsInGroupSet = new Set(groupToUpdate.tabs.map(t => t.id));
              let actuallyAddedNewTabsToThisGroup = false;

              suggestion.processedTabs.forEach(aiTabFromSuggestion => {
                  const isOriginallyUngrouped = ungroupedTabs.some(ut => ut.id === aiTabFromSuggestion.id);
                  if (!currentTabsInGroupSet.has(aiTabFromSuggestion.id) && isOriginallyUngrouped) {
                      groupToUpdate.tabs.push(aiTabFromSuggestion);
                      currentTabsInGroupSet.add(aiTabFromSuggestion.id); 
                      actuallyAddedNewTabsToThisGroup = true;
                  }
              });
              if (actuallyAddedNewTabsToThisGroup) groupsUpdatedCount++;
          } else { 
              const newGroupTabs = suggestion.processedTabs.filter(t => ungroupedTabs.some(ut => ut.id === t.id));
              if (newGroupTabs.length > 0) { 
                nextTabGroupsState.push({
                    id: `ai-group-${Date.now()}-${suggestion.groupName.replace(/\s+/g, '-')}`,
                    name: suggestion.groupName, 
                    tabs: newGroupTabs,
                    isCustom: false,
                });
                newGroupsCreatedCount++;
              }
          }
      });
      
      const finalTabGroups = nextTabGroupsState.filter(g => g.tabs.length > 0 || g.isCustom);
      setTabGroups(finalTabGroups);
      if (currentUser) {
        await persistTabGroups(finalTabGroups);
      }
      
      let toastMessage = "";
      if (newGroupsCreatedCount > 0 && groupsUpdatedCount > 0) {
        toastMessage = t("aiGroupsCreatedAndUpdated", { created: newGroupsCreatedCount, updated: groupsUpdatedCount });
      } else if (newGroupsCreatedCount > 0) {
        toastMessage = t("aiGroupSuggestionsAppliedDesc", { count: newGroupsCreatedCount });
      } else if (groupsUpdatedCount > 0) {
        toastMessage = t("aiGroupsUpdated", { count: groupsUpdatedCount });
      } else if (suggestedGroupsOutput.length === 0 && ungroupedTabs.length > 0) {
        toastMessage = t("noNewOrUpdatedGroups");
      } else {
        toastMessage = t("noNewOrUpdatedGroups"); 
      }
      toast({ title: t("aiSuggestionsProcessed"), description: toastMessage });

    } catch (error) {
      console.error("Error suggesting tab groups:", error);
      setAiSuggestionError(t("aiSuggestionErrorDescription"));
      toast({ title: t("aiError"), description: t("aiErrorGroupDesc"), variant: "destructive" });
    }
    setIsLoadingAI(false);
  };

  const handleSuggestInactiveTabs = async () => {
    if (!userSettings?.geminiApiKey) {
      toast({ title: t("apiKeyRequiredTitle"), description: t("apiKeyRequiredDesc"), variant: "destructive" });
      setAiSuggestionError(t("apiKeyRequiredTitle"));
      return;
    }

    setIsLoadingAI(true);
    setAiSuggestionError(null);
    const tabActivityData = JSON.stringify(tabs.map(t => ({ title: t.title, url: t.url, lastAccessed: t.lastAccessed })));
    const userPrefsString = userSettings?.aiPreferences || "";
    
    try {
      const input: SuggestInactiveTabsClosureInput = { tabActivityData, userPreferences: userPrefsString };
      const suggestions: SuggestInactiveTabsClosureOutput = await suggestInactiveTabsClosure(input);
      
      if (suggestions.tabsToClose.length > 0) {
        toast({
          title: t("aiSuggestsClosingTabs"),
          description: (
            <div>
              <p>{suggestions.reasoning}</p>
              <ul className="list-disc pl-5 mt-2">
                {suggestions.tabsToClose.map(url => {
                  const tab = tabs.find(t => t.url === url);
                  return <li key={url}>{tab?.title || url}</li>;
                })}
              </ul>
              <Button size="sm" className="mt-2" onClick={() => removeTabsByUrl(suggestions.tabsToClose)}>
                {t("closeSuggestedTabs")}
              </Button>
            </div>
          ),
          duration: 10000, 
        });
      } else {
        toast({ title: t("noInactiveTabsFound"), description: t("noInactiveTabsFoundDesc") });
      }
    } catch (error) {
      console.error("Error suggesting inactive tabs:", error);
      setAiSuggestionError(t("aiSuggestionErrorDescription"));
      toast({ title: t("aiError"), description: t("aiErrorInactiveDesc"), variant: "destructive" });
    }
    setIsLoadingAI(false);
  };
  
  const removeTabsByUrl = async (urlsToClose: string[]) => {
    const newTabs = tabs.filter(tab => !urlsToClose.includes(tab.url));
    const newTabGroups = tabGroups.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => !urlsToClose.includes(tab.url))
      })).filter(group => group.tabs.length > 0 || group.isCustom);

    setTabs(newTabs);
    setTabGroups(newTabGroups);
    if (currentUser) {
        await persistTabsAndGroups(newTabs, newTabGroups);
    }
    toast({ title: t("tabsClosed"), description: t("tabsClosedDesc", { count: urlsToClose.length }) });
  };

  const handleAddTab = async (newTab: Omit<Tab, 'id' | 'lastAccessed'>) => {
    let hostname = 'new-tab';
    let fullUrl = newTab.url;
    try {
        if (!/^https?:\/\//i.test(newTab.url)) {
          fullUrl = `https://${newTab.url}`;
        }
        hostname = new URL(fullUrl).hostname;
    } catch (e) {
        console.warn(`Invalid URL for manual tab: ${newTab.url}`);
    }
    const tabWithId: Tab = { 
      ...newTab,
      url: fullUrl,
      id: `manual-${hostname}-${Date.now()}`, 
      lastAccessed: Date.now(),
      faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
    };
    const updatedTabs = [...tabs, tabWithId];
    setTabs(updatedTabs);
    if (currentUser) {
      await persistTabs(updatedTabs);
    }
    toast({ title: t("tabAdded"), description: t("tabAddedDesc", { title: tabWithId.title }) });
  };

  const handleCreateCustomGroup = async (groupName: string) => {
    const newGroup: TabGroupType = {
      id: `custom-group-${Date.now()}-${groupName.replace(/\s+/g, '-')}`,
      name: groupName,
      tabs: [],
      isCustom: true,
    };
    const updatedGroups = [...tabGroups, newGroup];
    setTabGroups(updatedGroups);
    if (currentUser) {
      await persistTabGroups(updatedGroups);
    }
    toast({ title: t("groupCreated"), description: t("groupCreatedDesc", { name: groupName }) });
  };

  const handleRemoveTabFromGroup = async (groupId: string, tabId: string) => {
    const updatedGroups = tabGroups.map(group =>
        group.id === groupId
          ? { ...group, tabs: group.tabs.filter(tab => tab.id !== tabId) }
          : group
      ).filter(g => g.tabs.length > 0 || g.isCustom);
    setTabGroups(updatedGroups);
    if (currentUser) {
      await persistTabGroups(updatedGroups);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    const updatedGroups = tabGroups.filter(group => group.id !== groupId);
    setTabGroups(updatedGroups);
    if (currentUser) {
      await persistTabGroups(updatedGroups);
    }
    toast({ title: t("groupRemoved"), variant: "destructive" });
  };

  const handleExportGroup = (group: TabGroupType) => {
    const dataStr = JSON.stringify({ name: group.name, tabs: group.tabs.map(t => ({ title: t.title, url: t.url })) }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${group.name.replace(/\s+/g, '_').toLowerCase()}_tabs.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: t("groupExported"), description: t("groupExportedDesc", { name: group.name }) });
  };

  const handleDeleteAllGroups = async () => {
    const updatedGroups = tabGroups.filter(g => g.isCustom);
    setTabGroups(updatedGroups); 
    if (currentUser) {
      await persistTabGroups(updatedGroups);
    }
    toast({ title: t("allAIGroupsDeleted"), description: t("allAIGroupsDeletedDesc"), variant: "destructive" });
  };
  
  const handleAddTabToGroup = async (groupId: string, tabId: string) => {
    const tabToAdd = tabs.find(t => t.id === tabId);
    if (!tabToAdd) return;

    let updatedGroups = tabGroups.map(g => {
      if (g.tabs.some(t => t.id === tabId)) { // Remove from any existing group first
        return { ...g, tabs: g.tabs.filter(t => t.id !== tabId) };
      }
      return g;
    });
    
    updatedGroups = updatedGroups.map(g => {
      if (g.id === groupId) { // Add to the target group
        if (!g.tabs.some(t => t.id === tabId)) { // Ensure not already present
          return { ...g, tabs: [...g.tabs, tabToAdd] };
        }
      }
      return g;
    });
    const finalGroups = updatedGroups.filter(g => g.tabs.length > 0 || g.isCustom);
    setTabGroups(finalGroups);
    if (currentUser) {
      await persistTabGroups(finalGroups);
    }
    toast({title: t("tabAddedToGroup"), description: t("tabAddedToGroupDesc", { title: tabToAdd.title, groupName: tabGroups.find(g=>g.id === groupId)?.name || '' })});
  };


  const handleEditGroupName = async (groupId: string, newName: string) => {
    const updatedGroups = tabGroups.map(g => 
        g.id === groupId ? {...g, name: newName, isCustom: true } : g // Editing makes it custom
      );
    setTabGroups(updatedGroups);
    if (currentUser) {
      await persistTabGroups(updatedGroups);
    }
    toast({title: t("groupRenamed"), description: t("groupRenamedDesc", { name: newName })});
  };
  
  const handleDropOnGroup = async (draggedTabInfo: DraggedTabInfo, targetGroupId: string) => {
    const { tabId, sourceType, sourceGroupId } = draggedTabInfo;
  
    if (sourceType === 'group' && sourceGroupId === targetGroupId) return; 
  
    const tabToMove = tabs.find(t => t.id === tabId);
    if (!tabToMove) return;
  
    let newGroups = [...tabGroups];
    
    // Remove from source group if it was in one
    if (sourceType === 'group' && sourceGroupId) {
      newGroups = newGroups.map(g => 
        g.id === sourceGroupId 
          ? { ...g, tabs: g.tabs.filter(t => t.id !== tabId) }
          : g
      );
    }
  
    // Add to target group
    const targetGroupIndex = newGroups.findIndex(g => g.id === targetGroupId);
    if (targetGroupIndex !== -1 && !newGroups[targetGroupIndex].tabs.some(t => t.id === tabId)) {
      newGroups[targetGroupIndex] = {
        ...newGroups[targetGroupIndex],
        tabs: [...newGroups[targetGroupIndex].tabs, tabToMove]
      };
    }
    
    const finalGroups = newGroups.filter(g => g.tabs.length > 0 || g.isCustom);
    setTabGroups(finalGroups); 
    if (currentUser) {
      await persistTabGroups(finalGroups);
    }
    toast({ title: t("tabMoved"), description: t("tabMovedDesc", { title: tabToMove.title, groupName: tabGroups.find(g=>g.id === targetGroupId)?.name || 'target group'}) });
  };

  const handleDropOnUngroupedArea = async (draggedTabInfo: DraggedTabInfo) => {
    const { tabId, sourceType, sourceGroupId } = draggedTabInfo;
  
    if (sourceType === 'ungrouped') return; 
  
    const tabToMove = tabs.find(t => t.id === tabId);
    if (!tabToMove) return;
  
    if (sourceType === 'group' && sourceGroupId) {
      const updatedGroups = tabGroups.map(g => 
          g.id === sourceGroupId 
            ? { ...g, tabs: g.tabs.filter(t => t.id !== tabId) }
            : g
        ).filter(g => g.tabs.length > 0 || g.isCustom);
      setTabGroups(updatedGroups);
      if (currentUser) {
        await persistTabGroups(updatedGroups);
      }
    }
    toast({ title: t("tabMovedToUngrouped"), description: t("tabMovedToUngroupedDesc", { title: tabToMove.title }) });
  };

  const handleAddTabsBatch = useCallback(async (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => {
    if (!currentUser) return;

    const newTabsWithIds: Tab[] = tabsData.map((tab, index) => {
        let hostname = 'new-tab';
        let fullUrl = tab.url;
        try {
            if (!/^https?:\/\//i.test(tab.url)) {
              fullUrl = `https://${tab.url}`;
            }
            hostname = new URL(fullUrl).hostname;
        } catch (e) {
            console.warn(`Invalid URL in batch: ${tab.url}`);
        }
        return {
            ...tab,
            url: fullUrl,
            id: `imported-${hostname}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
            lastAccessed: Date.now(),
            faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
            isPlaceholder: true,
        };
    });
    const updatedTabs = [...tabs, ...newTabsWithIds];
    setTabs(updatedTabs);
    await persistTabs(updatedTabs);
    toast({ title: t("tabsImported"), description: t("tabsImportedDesc", { count: newTabsWithIds.length }) });
  }, [currentUser, tabs, persistTabs, toast, t]);

  const handleCreateGroupsWithTabsBatch = useCallback(async (groupsData: { name: string, tabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] }[]) => {
    if (!currentUser) return;

    const newGroups: TabGroupType[] = [];
    const allNewTabsForGlobalList: Tab[] = [];

    groupsData.forEach((groupData, groupIndex) => {
      const newGroupId = `imported-group-${Date.now()}-${groupIndex}-${groupData.name.replace(/\s+/g, '-')}`;
      const processedTabsForGroup: Tab[] = groupData.tabs.map((tab, tabIndex) => {
        let hostname = 'new-tab';
        let fullUrl = tab.url;
        try {
            if (!/^https?:\/\//i.test(tab.url)) {
              fullUrl = `https://${tab.url}`;
            }
            hostname = new URL(fullUrl).hostname;
        } catch (e) {
            console.warn(`Invalid URL in group batch: ${tab.url}`);
        }
        return {
          ...tab,
          url: fullUrl,
          id: `imported-gtab-${hostname}-${Date.now()}-${groupIndex}-${tabIndex}-${Math.random().toString(36).substring(2,7)}`,
          lastAccessed: Date.now(),
          faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
          isPlaceholder: true,
        };
      });
      
      newGroups.push({
        id: newGroupId,
        name: groupData.name,
        tabs: processedTabsForGroup,
        isCustom: true, 
      });
      allNewTabsForGlobalList.push(...processedTabsForGroup);
    });

    const updatedTabs = [...tabs, ...allNewTabsForGlobalList];
    const updatedGroups = [...tabGroups, ...newGroups];
    setTabs(updatedTabs);
    setTabGroups(updatedGroups);
    await persistTabsAndGroups(updatedTabs, updatedGroups);

    toast({ title: t("groupsImported"), description: t("groupsImportedDesc", { count: newGroups.length }) });
  }, [currentUser, tabs, tabGroups, persistTabsAndGroups, toast, t]);


  useEffect(() => {
    registerAddTabsBatch(handleAddTabsBatch);
    registerCreateGroupsWithTabsBatch(handleCreateGroupsWithTabsBatch);
    return () => {
      registerAddTabsBatch(null); 
      registerCreateGroupsWithTabsBatch(null);
    };
  }, [registerAddTabsBatch, handleAddTabsBatch, registerCreateGroupsWithTabsBatch, handleCreateGroupsWithTabsBatch]);

  const hasAiGroups = tabGroups.some(g => !g.isCustom);

  const AiSuggestButtonWrapper = ({children}: {children: React.ReactNode}) => {
    if (userSettings && userSettings.geminiApiKey) { // Check if settings are loaded and API key exists
        return <>{children}</>;
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent>
                    <p>{t('apiKeyRequiredTooltip')}</p>
                     <Button variant="link" size="sm" asChild className="p-0 h-auto">
                        <Link href="/settings">
                            {t('goToSettings')} <KeyRound className="ml-1 h-3 w-3"/>
                        </Link>
                    </Button>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  };

  if (authLoading || isLoadingData) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">{t('loadingYourData', {defaultValue: "Loading your TabWise data..."})}</p>
        </div>
    );
  }
  
  if (!currentUser && !authLoading) {
    // This case should ideally be handled by AuthProvider redirecting to login
    // but as a fallback or if user lands here directly somehow:
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="mt-4 text-lg text-destructive">{t('authRequiredToViewDashboard', {defaultValue: "Please log in to view your dashboard."})}</p>
            <Button asChild className="mt-4">
                <Link href="/login">{t('goToLogin', {defaultValue: "Go to Login"})}</Link>
            </Button>
        </div>
    );
  }


  return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{t("tabwiseDashboard")}</h1>
          <div className="flex flex-wrap gap-2">
            <AddTabModal onAddTab={handleAddTab} />
            <CreateGroupModal onCreateGroup={handleCreateCustomGroup} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border rounded-lg shadow bg-card">
          <AiSuggestButtonWrapper>
            <Button 
              onClick={handleSuggestTabGroups} 
              disabled={isLoadingAI || ungroupedTabs.length === 0 || (!userSettings || !userSettings.geminiApiKey)}
            >
              <Zap className="mr-2 h-4 w-4" /> {isLoadingAI ? t('aiSuggesting') : t('aiSuggestGroups')}
            </Button>
          </AiSuggestButtonWrapper>

          <AiSuggestButtonWrapper>
            <Button 
              onClick={handleSuggestInactiveTabs} 
              disabled={isLoadingAI || (!userSettings || !userSettings.geminiApiKey)}
            >
              <Lightbulb className="mr-2 h-4 w-4" /> {isLoadingAI ? t('aiAnalyzing') : t('aiSuggestCloseTabs')}
            </Button>
          </AiSuggestButtonWrapper>
          
          {hasAiGroups && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoadingAI}>
                  <Trash2 className="mr-2 h-4 w-4" /> {t("deleteAllAIGroups")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteAllAIGroupsConfirmation")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAllGroups} 
                    className={cn(buttonVariants({ variant: "destructive" }))}
                  >
                    {t("yesDeleteAllAIGroups")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {aiSuggestionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("aiSuggestionErrorTitle")}</AlertTitle>
            <AlertDescription>
                {aiSuggestionError}
                {aiSuggestionError === t("apiKeyRequiredTitle") && (
                    <Button variant="link" asChild className="p-0 h-auto ml-1">
                        <Link href="/settings">
                             {t('goToSettings')}
                        </Link>
                    </Button>
                )}
            </AlertDescription>
          </Alert>
        )}

        {isLoadingAI && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                  <Card key={i} className="flex flex-col h-full">
                      <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                      <CardContent className="flex-grow p-4 space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                      </CardContent>
                      <CardFooter><Skeleton className="h-8 w-1/2 ml-auto" /></CardFooter>
                  </Card>
              ))}
          </div>
        )}

        {!isLoadingAI && tabGroups.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">{t("tabGroups")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabGroups.map((group) => (
                <TabGroup
                  key={group.id}
                  group={group}
                  onRemoveTab={handleRemoveTabFromGroup}
                  onRemoveGroup={handleRemoveGroup}
                  onExportGroup={handleExportGroup}
                  onAddTabToGroup={(groupId) => {
                      if (ungroupedTabs.length > 0) {
                          // Potentially show a dropdown or modal to select which ungrouped tab to add
                          handleAddTabToGroup(groupId, ungroupedTabs[0].id); // Adds the first one for now
                      } else {
                          toast({ title: t("noUngroupedTabs"), description: t("noUngroupedTabsDesc"), variant: "default"});
                      }
                  }}
                  onEditGroupName={handleEditGroupName}
                  onDropTab={handleDropOnGroup}
                />
              ))}
            </div>
          </div>
        )}
        
        {!isLoadingAI && ungroupedTabs.length > 0 && (
          <div className="mt-8">
             <Separator className="my-6" />
            <h2 className="text-2xl font-semibold mb-4">{t("ungroupedTabsCount", { count: ungroupedTabs.length })}</h2>
             <div 
                onDragOver={(e) => { e.preventDefault(); setIsUngroupedDragOver(true); }}
                onDragLeave={() => setIsUngroupedDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsUngroupedDragOver(false);
                  try {
                    const dataString = e.dataTransfer.getData('application/json');
                    if (dataString) {
                      const draggedTabInfo: DraggedTabInfo = JSON.parse(dataString);
                      if (draggedTabInfo.tabId && draggedTabInfo.sourceType !== undefined) {
                         handleDropOnUngroupedArea(draggedTabInfo);
                      }
                    }
                  } catch (err) {
                    console.error("Failed to parse dropped data on ungrouped area", err);
                  }
                }}
                className={cn(
                  "space-y-2 p-4 rounded-lg border border-dashed",
                  isUngroupedDragOver ? "border-primary ring-2 ring-primary bg-primary/10" : "border-muted"
                )}
              >
              {ungroupedTabs.map(tab => (
                <TabItem 
                  key={tab.id} 
                  tab={tab}
                  sourceInfo={{ type: 'ungrouped' }}
                  onRemove={async (tabId) => {
                    const newTabs = tabs.filter(t => t.id !== tabId);
                    // Also ensure this tab is removed if it was somehow in a group (shouldn't be if it's in ungroupedTabs)
                    const newTabGroups = tabGroups.map(group => ({
                        ...group,
                        tabs: group.tabs.filter(t => t.id !== tabId)
                      })).filter(group => group.tabs.length > 0 || group.isCustom);
                    
                    setTabs(newTabs);
                    setTabGroups(newTabGroups); // Though it shouldn't affect groups if truly ungrouped
                    if (currentUser) {
                        await persistTabsAndGroups(newTabs, newTabGroups);
                    }
                }} />
              ))}
            </div>
          </div>
        )}
        
        {!isLoadingAI && tabGroups.length === 0 && ungroupedTabs.length === 0 && (
          <div className="text-center py-10">
            <Layers3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-xl font-semibold">{t("noTabsOrGroups")}</h3>
            <p className="mt-1 text-muted-foreground">
              {t("noTabsOrGroupsDescription")}
            </p>
            <div className="mt-6 flex justify-center gap-2">
               <AddTabModal onAddTab={handleAddTab} />
                <AiSuggestButtonWrapper>
                  <Button 
                      onClick={handleSuggestTabGroups} 
                      disabled={isLoadingAI || ungroupedTabs.length === 0 || (!userSettings || !userSettings.geminiApiKey)}
                  >
                      <Zap className="mr-2 h-4 w-4" /> {t('aiSuggestGroups')}
                  </Button>
                </AiSuggestButtonWrapper>
            </div>
          </div>
        )}
      </div>
  );
}

export default function DashboardPage() {
    return <DashboardPageContent />;
}
