"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Tab, TabGroup as TabGroupType } from '@/types';
import { TabGroup, type DraggedTabInfo } from '@/components/dashboard/tab-group';
import { AddTabModal } from '@/components/dashboard/add-tab-modal';
import { CreateGroupModal } from '@/components/dashboard/create-group-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Zap, Lightbulb, Trash2, AlertTriangle, FolderPlus, Layers3 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  const [isUngroupedDragOver, setIsUngroupedDragOver] = useState(false);

  const ungroupedTabs = tabs.filter(tab => !tabGroups.some(group => group.tabs.some(t => t.id === tab.id)));

  const handleSuggestTabGroups = async () => {
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
      };
      const suggestedGroupsOutput: SuggestTabGroupsOutput = await suggestTabGroups(input);
      
      const nextTabGroupsState = [...tabGroups];
      let newGroupsCreatedCount = 0;
      let groupsUpdatedCount = 0;

      const aiSuggestions = suggestedGroupsOutput.map((sg, index) => ({
          ...sg,
          processedTabs: sg.tabUrls.map(url => {
            const existingTab = tabs.find(t => t.url === url);
            if (existingTab) return existingTab;
            return { id: `ai-new-tab-${url}-${index}`, title: new URL(url).hostname, url, lastAccessed: Date.now() } as Tab;
          }).filter(Boolean) as Tab[]
      }));
      
      aiSuggestions.forEach(suggestion => {
          if (suggestion.processedTabs.length === 0 && !suggestion.groupName) return;
          const existingGroupIndex = nextTabGroupsState.findIndex(g => g.name === suggestion.groupName);

          if (existingGroupIndex !== -1) { 
              const groupToUpdate = nextTabGroupsState[existingGroupIndex];
              const currentTabsInGroupSet = new Set(groupToUpdate.tabs.map(t => t.id));
              let actuallyAddedNewTabs = false;

              suggestion.processedTabs.forEach(aiTabFromSuggestion => {
                  const isOriginallyUngrouped = ungroupedTabs.some(ut => ut.id === aiTabFromSuggestion.id);
                  if (!currentTabsInGroupSet.has(aiTabFromSuggestion.id) && isOriginallyUngrouped) {
                      groupToUpdate.tabs.push(aiTabFromSuggestion);
                      currentTabsInGroupSet.add(aiTabFromSuggestion.id);
                      actuallyAddedNewTabs = true;
                  } else if (!currentTabsInGroupSet.has(aiTabFromSuggestion.id) && !isOriginallyUngrouped) {
                    groupToUpdate.tabs.push(aiTabFromSuggestion);
                    currentTabsInGroupSet.add(aiTabFromSuggestion.id);
                  }
              });
              if (actuallyAddedNewTabs) groupsUpdatedCount++;
          } else { 
              nextTabGroupsState.push({
                  id: `ai-group-${Date.now()}-${suggestion.groupName.replace(/\s+/g, '-')}`,
                  name: suggestion.groupName,
                  tabs: suggestion.processedTabs.filter(t => ungroupedTabs.some(ut => ut.id === t.id)),
                  isCustom: false,
              });
              newGroupsCreatedCount++;
          }
      });
      
      setTabGroups(nextTabGroupsState.filter(g => g.tabs.length > 0 || g.isCustom));
      
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
    setTabGroups(prevGroups => prevGroups.filter(g => g.isCustom));
    toast({ title: t("allAIGroupsDeleted"), description: t("allAIGroupsDeletedDesc"), variant: "destructive" });
  };
  
  const handleAddTabToGroup = (groupId: string) => {
    if (ungroupedTabs.length > 0) {
      const tabToAdd = ungroupedTabs[0]; // Add the first ungrouped tab
      setTabGroups(prevGroups => 
        prevGroups.map(g => 
          g.id === groupId ? {...g, tabs: [...g.tabs, tabToAdd]} : g
        )
      );
      toast({title: t("tabAddedToGroup"), description: t("tabAddedToGroupDesc", { title: tabToAdd.title, group: tabGroups.find(g=>g.id === groupId)?.name || '' })});
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
  
  const handleDropOnGroup = (draggedTabInfo: DraggedTabInfo, targetGroupId: string) => {
    const { tabId, sourceType, sourceGroupId } = draggedTabInfo;
  
    if (sourceType === 'group' && sourceGroupId === targetGroupId) return; 
  
    const tabToMove = tabs.find(t => t.id === tabId);
    if (!tabToMove) return;
  
    setTabGroups(prevGroups => {
      let newGroups = prevGroups.map(g => ({ ...g, tabs: [...g.tabs] }));
  
      // Remove from source group if it was in one
      if (sourceType === 'group' && sourceGroupId) {
        const srcGroup = newGroups.find(g => g.id === sourceGroupId);
        if (srcGroup) {
          srcGroup.tabs = srcGroup.tabs.filter(t => t.id !== tabId);
        }
      }
  
      // Add to target group
      const tgtGroup = newGroups.find(g => g.id === targetGroupId);
      if (tgtGroup && !tgtGroup.tabs.some(t => t.id === tabId)) {
        tgtGroup.tabs.push(tabToMove);
      }
      return newGroups.filter(g => g.tabs.length > 0 || g.isCustom);
    });
    toast({ title: t("tabMoved"), description: t("tabMovedDesc", { title: tabToMove.title, groupName: tabGroups.find(g=>g.id === targetGroupId)?.name || 'target group'}) });
  };

  const handleDropOnUngroupedArea = (draggedTabInfo: DraggedTabInfo) => {
    const { tabId, sourceType, sourceGroupId } = draggedTabInfo;
  
    if (sourceType === 'ungrouped') return; // Already ungrouped
  
    const tabToMove = tabs.find(t => t.id === tabId);
    if (!tabToMove) return;
  
    if (sourceType === 'group' && sourceGroupId) {
      setTabGroups(prevGroups => {
        let newGroups = prevGroups.map(g => ({ ...g, tabs: [...g.tabs] }));
        const srcGroup = newGroups.find(g => g.id === sourceGroupId);
        if (srcGroup) {
          srcGroup.tabs = srcGroup.tabs.filter(t => t.id !== tabId);
        }
        return newGroups.filter(g => g.tabs.length > 0 || g.isCustom);
      });
    }
    toast({ title: t("tabMovedToUngrouped"), description: t("tabMovedToUngroupedDesc", { title: tabToMove.title }) });
  };


  const hasAiGroups = tabGroups.some(g => !g.isCustom);

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
                <AlertDialogAction onClick={handleDeleteAllGroups} className={buttonVariants({ variant: "destructive" })}>
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
                onRemove={(tabId) => {
                  setTabs(prevTabs => prevTabs.filter(t => t.id !== tabId));
                  // Also remove from any group it might be in (though ungroupedTabs should already filter this)
                  setTabGroups(prevGroups => 
                    prevGroups.map(group => ({
                      ...group,
                      tabs: group.tabs.filter(t => t.id !== tabId)
                    })).filter(group => group.tabs.length > 0 || group.isCustom)
                  );
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
             <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI || ungroupedTabs.length === 0}>
                <Zap className="mr-2 h-4 w-4" /> {t('aiSuggestGroups')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
