
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Tab, TabGroup as TabGroupType } from '@/types';
import { TabGroup } from '@/components/dashboard/tab-group';
import { AddTabModal } from '@/components/dashboard/add-tab-modal';
import { CreateGroupModal } from '@/components/dashboard/create-group-modal';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Zap, Lightbulb, Trash2, AlertTriangle, FolderPlus, PlusCircle, Layers3 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

const initialTabs: Tab[] = [
  { id: '1', title: 'Next.js Docs', url: 'https://nextjs.org/docs', lastAccessed: Date.now() - 1000 * 60 * 5 },
  { id: '2', title: 'Tailwind CSS', url: 'https://tailwindcss.com/docs/installation', lastAccessed: Date.now() - 1000 * 60 * 10 },
  { id: '3', title: 'ShadCN UI', url: 'https://ui.shadcn.com/docs', lastAccessed: Date.now() - 1000 * 60 * 2 },
  { id: '4', title: 'React Docs', url: 'https://react.dev/', lastAccessed: Date.now() - 1000 * 60 * 60 * 2 },
  { id: '5', title: 'GitHub', url: 'https://github.com', lastAccessed: Date.now() - 1000 * 60 * 30 },
  { id: '6', title: 'Google News', url: 'https://news.google.com', lastAccessed: Date.now() - 1000 * 60 * 60 * 24 },
  { id: '7', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', lastAccessed: Date.now() - 1000 * 60 * 15 },
];

export default function DashboardPage() {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [tabGroups, setTabGroups] = useState<TabGroupType[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const ungroupedTabs = tabs.filter(tab => !tabGroups.some(group => group.tabs.some(t => t.id === tab.id)));

  const handleSuggestTabGroups = async () => {
    setIsLoadingAI(true);
    setAiSuggestionError(null);
    const currentTabUrls = tabs.map(t => t.url);
    if (currentTabUrls.length === 0) {
      toast({ title: t("noTabsToGroup"), description: t("noTabsToGroupDesc"), variant: "destructive" });
      setIsLoadingAI(false);
      return;
    }

    try {
      const input: SuggestTabGroupsInput = { urls: currentTabUrls };
      const suggestedGroupsOutput: SuggestTabGroupsOutput = await suggestTabGroups(input);
      
      const newGroups: TabGroupType[] = suggestedGroupsOutput.map((sg, index) => ({
        id: `ai-group-${Date.now()}-${index}`,
        name: sg.groupName,
        tabs: sg.tabUrls.map(url => tabs.find(t => t.url === url)).filter(Boolean) as Tab[],
        isCustom: false,
      }));
      
      setTabGroups(prevGroups => [...prevGroups.filter(g => g.isCustom), ...newGroups]);
      toast({ title: t("aiGroupSuggestionsApplied"), description: t("aiGroupSuggestionsAppliedDesc", { count: newGroups.length }) });
    } catch (error) {
      console.error("Error suggesting tab groups:", error);
      setAiSuggestionError(t("aiSuggestionErrorDescription"));
      toast({ title: t("aiError"), description: t("aiErrorGroupDesc"), variant: "destructive" });
    }
    setIsLoadingAI(false);
  };

  const handleSuggestInactiveTabs = async () => {
    setIsLoadingAI(true);
    setAiSuggestionError(null);
    const tabActivityData = JSON.stringify(tabs.map(t => ({ title: t.title, url: t.url, lastAccessed: t.lastAccessed })));
    
    try {
      const input: SuggestInactiveTabsClosureInput = { tabActivityData };
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
  
  const removeTabsByUrl = (urlsToClose: string[]) => {
    setTabs(prevTabs => prevTabs.filter(tab => !urlsToClose.includes(tab.url)));
    setTabGroups(prevGroups => 
      prevGroups.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => !urlsToClose.includes(tab.url))
      })).filter(group => group.tabs.length > 0 || group.isCustom)
    );
    toast({ title: t("tabsClosed"), description: t("tabsClosedDesc", { count: urlsToClose.length }) });
  };

  const handleAddTab = (newTab: Omit<Tab, 'id' | 'lastAccessed'>) => {
    const tabWithId: Tab = { ...newTab, id: `manual-${Date.now()}`, lastAccessed: Date.now() };
    setTabs(prevTabs => [...prevTabs, tabWithId]);
    toast({ title: t("tabAdded"), description: t("tabAddedDesc", { title: tabWithId.title }) });
  };

  const handleCreateCustomGroup = (groupName: string) => {
    const newGroup: TabGroupType = {
      id: `custom-group-${Date.now()}`,
      name: groupName,
      tabs: [],
      isCustom: true,
    };
    setTabGroups(prevGroups => [...prevGroups, newGroup]);
    toast({ title: t("groupCreated"), description: t("groupCreatedDesc", { name: groupName }) });
  };

  const handleRemoveTabFromGroup = (groupId: string, tabId: string) => {
    setTabGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? { ...group, tabs: group.tabs.filter(tab => tab.id !== tabId) }
          : group
      )
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    setTabGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
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

  const handleDeleteAllGroups = () => {
    setTabGroups([]);
    toast({ title: t("allGroupsDeleted"), description: t("allGroupsDeletedDesc"), variant: "destructive" });
  };
  
  const handleAddTabToGroup = (groupId: string) => {
    if (ungroupedTabs.length > 0) {
      const tabToAdd = ungroupedTabs[0];
      setTabGroups(prevGroups => 
        prevGroups.map(g => 
          g.id === groupId ? {...g, tabs: [...g.tabs, tabToAdd]} : g
        )
      );
      toast({title: t("tabAddedToGroup"), description: t("tabAddedToGroupDesc", { title: tabToAdd.title })});
    } else {
      toast({title: t("noUngroupedTabs"), description: t("noUngroupedTabsDesc"), variant: "destructive"});
    }
  };

  const handleEditGroupName = (groupId: string, newName: string) => {
    setTabGroups(prevGroups => 
      prevGroups.map(g => 
        g.id === groupId ? {...g, name: newName} : g
      )
    );
    toast({title: t("groupRenamed"), description: t("groupRenamedDesc", { name: newName })});
  };

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
        <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI}>
          <Zap className="mr-2 h-4 w-4" /> {isLoadingAI ? t('aiSuggesting') : t('aiSuggestGroups')}
        </Button>
        <Button onClick={handleSuggestInactiveTabs} disabled={isLoadingAI}>
          <Lightbulb className="mr-2 h-4 w-4" /> {isLoadingAI ? t('aiAnalyzing') : t('aiSuggestCloseTabs')}
        </Button>
        {tabGroups.length > 0 && (
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoadingAI}>
                <Trash2 className="mr-2 h-4 w-4" /> {t("deleteAllGroups")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteAllGroupsConfirmation")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllGroups} className={Button({variant: "destructive"}).className}>
                  {t("yesDeleteAll")}
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
          <AlertDescription>{aiSuggestionError}</AlertDescription>
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
                onAddTabToGroup={handleAddTabToGroup}
                onEditGroupName={handleEditGroupName}
              />
            ))}
          </div>
        </div>
      )}
      
      {!isLoadingAI && ungroupedTabs.length > 0 && (
        <div className="mt-8">
           <Separator className="my-6" />
          <h2 className="text-2xl font-semibold mb-4">{t("ungroupedTabsCount", { count: ungroupedTabs.length })}</h2>
           <div className="space-y-2">
            {ungroupedTabs.map(tab => (
              <TabItem key={tab.id} tab={tab} onRemove={(tabId) => setTabs(tabs.filter(t => t.id !== tabId))} />
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
             <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI}>
                <Zap className="mr-2 h-4 w-4" /> {t('aiSuggestGroups')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
