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
import { TabItem } from '@/components/dashboard/tab-item'; // Added import for TabItem
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

  const ungroupedTabs = tabs.filter(tab => !tabGroups.some(group => group.tabs.some(t => t.id === tab.id)));

  // AI Tab Grouping
  const handleSuggestTabGroups = async () => {
    setIsLoadingAI(true);
    setAiSuggestionError(null);
    const currentTabUrls = tabs.map(t => t.url);
    if (currentTabUrls.length === 0) {
      toast({ title: "No tabs to group", description: "Add some tabs first.", variant: "destructive" });
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
      
      setTabGroups(prevGroups => [...prevGroups.filter(g => g.isCustom), ...newGroups]); // Keep custom groups, replace AI groups
      toast({ title: "AI Group Suggestions Applied", description: `${newGroups.length} groups suggested.` });
    } catch (error) {
      console.error("Error suggesting tab groups:", error);
      setAiSuggestionError("Failed to get AI tab group suggestions. Please try again.");
      toast({ title: "AI Error", description: "Could not suggest tab groups.", variant: "destructive" });
    }
    setIsLoadingAI(false);
  };

  // AI Inactive Tab Closure Suggestions
  const handleSuggestInactiveTabs = async () => {
    setIsLoadingAI(true);
    setAiSuggestionError(null);
    const tabActivityData = JSON.stringify(tabs.map(t => ({ title: t.title, url: t.url, lastAccessed: t.lastAccessed })));
    
    try {
      const input: SuggestInactiveTabsClosureInput = { tabActivityData };
      // Optional: Add userPreferences if implemented
      // input.userPreferences = "prefer to keep documentation tabs open longer";
      const suggestions: SuggestInactiveTabsClosureOutput = await suggestInactiveTabsClosure(input);
      
      if (suggestions.tabsToClose.length > 0) {
        toast({
          title: "AI Suggests Closing Tabs",
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
                Close Suggested Tabs
              </Button>
            </div>
          ),
          duration: 10000, // Longer duration for interactive toast
        });
      } else {
        toast({ title: "No Inactive Tabs Found", description: "All your tabs seem active or important according to the AI." });
      }
    } catch (error) {
      console.error("Error suggesting inactive tabs:", error);
      setAiSuggestionError("Failed to get AI inactive tab suggestions. Please try again.");
      toast({ title: "AI Error", description: "Could not suggest inactive tabs.", variant: "destructive" });
    }
    setIsLoadingAI(false);
  };
  
  const removeTabsByUrl = (urlsToClose: string[]) => {
    setTabs(prevTabs => prevTabs.filter(tab => !urlsToClose.includes(tab.url)));
    setTabGroups(prevGroups => 
      prevGroups.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => !urlsToClose.includes(tab.url))
      })).filter(group => group.tabs.length > 0 || group.isCustom) // Keep custom empty groups
    );
    toast({ title: "Tabs Closed", description: `${urlsToClose.length} tabs were closed.` });
  };

  const handleAddTab = (newTab: Omit<Tab, 'id' | 'lastAccessed'>) => {
    const tabWithId: Tab = { ...newTab, id: `manual-${Date.now()}`, lastAccessed: Date.now() };
    setTabs(prevTabs => [...prevTabs, tabWithId]);
    toast({ title: "Tab Added", description: `"${tabWithId.title}" has been added.` });
  };

  const handleCreateCustomGroup = (groupName: string) => {
    const newGroup: TabGroupType = {
      id: `custom-group-${Date.now()}`,
      name: groupName,
      tabs: [],
      isCustom: true,
    };
    setTabGroups(prevGroups => [...prevGroups, newGroup]);
    toast({ title: "Group Created", description: `Custom group "${groupName}" has been created.` });
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
    toast({ title: "Group Removed", variant: "destructive" });
  };

  const handleExportGroup = (group: TabGroupType) => {
    const dataStr = JSON.stringify({ name: group.name, tabs: group.tabs.map(t => ({ title: t.title, url: t.url })) }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${group.name.replace(/\s+/g, '_').toLowerCase()}_tabs.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: "Group Exported", description: `"${group.name}" exported as JSON.` });
  };

  const handleDeleteAllGroups = () => {
    setTabGroups([]);
    toast({ title: "All Groups Deleted", description: "All tab groups have been removed.", variant: "destructive" });
  };
  
  const handleAddTabToGroup = (groupId: string) => {
    // This is a placeholder. A real implementation would involve a modal to select a tab or enter a new one.
    // For now, let's pick a random ungrouped tab if available.
    if (ungroupedTabs.length > 0) {
      const tabToAdd = ungroupedTabs[0];
      setTabGroups(prevGroups => 
        prevGroups.map(g => 
          g.id === groupId ? {...g, tabs: [...g.tabs, tabToAdd]} : g
        )
      );
      toast({title: "Tab added to group", description: `Tab "${tabToAdd.title}" added to group.`});
    } else {
      toast({title: "No ungrouped tabs", description: "Add new tabs or ungroup existing ones to add to this group.", variant: "destructive"});
    }
  };

  const handleEditGroupName = (groupId: string, newName: string) => {
    setTabGroups(prevGroups => 
      prevGroups.map(g => 
        g.id === groupId ? {...g, name: newName} : g
      )
    );
    toast({title: "Group Renamed", description: `Group name updated to "${newName}".`});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">TabWise Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <AddTabModal onAddTab={handleAddTab} />
          <CreateGroupModal onCreateGroup={handleCreateCustomGroup} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-4 border rounded-lg shadow bg-card">
        <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI}>
          <Zap className="mr-2 h-4 w-4" /> {isLoadingAI ? 'Suggesting...' : 'AI Suggest Groups'}
        </Button>
        <Button onClick={handleSuggestInactiveTabs} disabled={isLoadingAI}>
          <Lightbulb className="mr-2 h-4 w-4" /> {isLoadingAI ? 'Analyzing...' : 'AI Suggest Close Tabs'}
        </Button>
        {tabGroups.length > 0 && (
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoadingAI}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete All Groups
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all tab groups.
                  Ungrouped tabs will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllGroups} className={Button({variant: "destructive"}).className}>
                  Yes, delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {aiSuggestionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Suggestion Error</AlertTitle>
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
          <h2 className="text-2xl font-semibold mb-4">Tab Groups</h2>
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
          <h2 className="text-2xl font-semibold mb-4">Ungrouped Tabs ({ungroupedTabs.length})</h2>
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
          <h3 className="mt-2 text-xl font-semibold">No Tabs or Groups</h3>
          <p className="mt-1 text-muted-foreground">
            Add some tabs or use AI suggestions to get started.
          </p>
          <div className="mt-6 flex justify-center gap-2">
             <AddTabModal onAddTab={handleAddTab} />
             <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI}>
                <Zap className="mr-2 h-4 w-4" /> AI Suggest Groups
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
