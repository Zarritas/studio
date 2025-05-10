
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Tab, TabGroup as TabGroupType } from '@/types';
import { TabGroup, type DraggedTabInfo } from '@/components/dashboard/tab-group';
import { AddTabModal } from '@/components/dashboard/add-tab-modal';
import { CreateGroupModal } from '@/components/dashboard/create-group-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Zap, Lightbulb, Trash2, AlertTriangle, Layers3 } from 'lucide-react';
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
  { id: '5', title: 'GitHub - My Project', url: 'https://github.com/my-username/my-repo', lastAccessed: Date.now() - 1000 * 60 * 30 },
  { id: '6', title: 'Google News - Tech', url: 'https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen', lastAccessed: Date.now() - 1000 * 60 * 60 * 24 },
  { id: '7', title: 'MDN Web Docs - JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', lastAccessed: Date.now() - 1000 * 60 * 15 },
  { id: '8', title: 'Stack Overflow - React Hooks Question', url: 'https://stackoverflow.com/questions/tagged/react-hooks', lastAccessed: Date.now() - 1000 * 60 * 45 },
  { id: '9', title: 'YouTube - Coding Tutorial', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', lastAccessed: Date.now() - 1000 * 60 * 20 }, 
  { id: '10', title: 'Twitter / X - Tech News Feed', url: 'https://x.com/elonmusk', lastAccessed: Date.now() - 1000 * 60 * 50 },
  { id: '11', title: 'Figma Community - UI Kits', url: 'https://www.figma.com/community/category/ui_kits', lastAccessed: Date.now() - 1000 * 60 * 60 * 3 },
  { id: '12', title: 'Google Drive - Project Files', url: 'https://drive.google.com/drive/my-drive', lastAccessed: Date.now() - 1000 * 60 * 120 },
  { id: '13', title: 'Notion - Meeting Notes', url: 'https://www.notion.so/meeting-notes-xyz', lastAccessed: Date.now() - 1000 * 60 * 90 },
  { id: '14', title: 'Spotify - Lo-fi Beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', lastAccessed: Date.now() - 1000 * 60 * 60 * 5 },
  { id: '15', title: 'Wikipedia - AI History', url: 'https://en.wikipedia.org/wiki/History_of_artificial_intelligence', lastAccessed: Date.now() - 1000 * 60 * 25 },
  { id: '16', title: 'Reddit - r/programming', url: 'https://www.reddit.com/r/programming/', lastAccessed: Date.now() - 1000 * 60 * 35 },
  { id: '17', title: 'AWS Console - S3 Buckets', url: 'https://s3.console.aws.amazon.com/s3/home', lastAccessed: Date.now() - 1000 * 60 * 60 * 4 },
  { id: '18', title: 'Netflix - New Series', url: 'https://www.netflix.com/browse', lastAccessed: Date.now() - 1000 * 60 * 180 },
  { id: '19', title: 'LinkedIn - My Network', url: 'https://www.linkedin.com/mynetwork/', lastAccessed: Date.now() - 1000 * 60 * 55 },
  { id: '20', title: 'Duolingo - Spanish Lesson', url: 'https://www.duolingo.com/learn', lastAccessed: Date.now() - 1000 * 60 * 5 },
  { id: '21', title: 'Coursera - Machine Learning Course', url: 'https://www.coursera.org/learn/machine-learning', lastAccessed: Date.now() - 1000 * 60 * 60 * 48 },
  { id: '22', title: 'Amazon - Shopping Cart', url: 'https://www.amazon.com/gp/cart/view.html', lastAccessed: Date.now() - 1000 * 60 * 10 },
  { id: '23', title: 'Medium - Tech Article', url: 'https://medium.com/topic/technology', lastAccessed: Date.now() - 1000 * 60 * 60 },
  { id: '24', title: 'The Verge - Gadget Reviews', url: 'https://www.theverge.com/reviews', lastAccessed: Date.now() - 1000 * 60 * 120 },
  { id: '25', title: 'Khan Academy - Math Practice', url: 'https://www.khanacademy.org/math', lastAccessed: Date.now() - 1000 * 60 * 300 },
  { id: '26', title: 'Pinterest - Home Decor Ideas', url: 'https://www.pinterest.com/ideas/home-decor/914173009174/', lastAccessed: Date.now() - 1000 * 60 * 40 },
  { id: '27', title: 'ESPN - Sports News', url: 'https://www.espn.com/', lastAccessed: Date.now() - 1000 * 60 * 70 },
  { id: '28', title: 'AllRecipes - Dinner Ideas', url: 'https://www.allrecipes.com/', lastAccessed: Date.now() - 1000 * 60 * 150 },
  { id: '29', title: 'Dev.to - Blog Post', url: 'https://dev.to/', lastAccessed: Date.now() - 1000 * 60 * 60 * 6 },
  { id: '30', title: 'Adobe Color - Color Palette Generator', url: 'https://color.adobe.com/create/color-wheel', lastAccessed: Date.now() - 1000 * 60 * 80 },
];


export default function DashboardPage() {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [tabGroups, setTabGroups] = useState<TabGroupType[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, locale } = useTranslation();
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
        targetLanguage: locale, 
      };
      const suggestedGroupsOutput: SuggestTabGroupsOutput = await suggestTabGroups(input);
      
      const nextTabGroupsState = [...tabGroups];
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
      
            // Check if tab already exists (either by original or schemed URL)
            const existingTab = tabs.find(t => t.url === urlFromAI || t.url === schemedUrl);
            if (existingTab) return existingTab;
      
            try {
              return { 
                id: `ai-new-tab-${urlFromAI}-${index}`, // Use original urlFromAI for ID generation consistency
                title: new URL(schemedUrl).hostname, // Use schemedUrl for URL object
                url: schemedUrl, // Store the (potentially) corrected URL
                lastAccessed: Date.now() 
              } as Tab;
            } catch (e) {
              console.warn(`Invalid URL from AI after attempting to add scheme, skipping: '${urlFromAI}' -> '${schemedUrl}'`, e);
              return null; // Skip this tab if URL is still invalid
            }
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
                  // Only add if it's an originally ungrouped tab AND not already in this group
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
      ).filter(g => g.tabs.length > 0 || g.isCustom) 
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
  
  const handleAddTabToGroup = (groupId: string, tabId: string) => {
    const tabToAdd = tabs.find(t => t.id === tabId);
    if (!tabToAdd) return;

    let updatedGroups = tabGroups.map(g => {
      if (g.tabs.some(t => t.id === tabId)) {
        return { ...g, tabs: g.tabs.filter(t => t.id !== tabId) };
      }
      return g;
    });
    
    updatedGroups = updatedGroups.map(g => {
      if (g.id === groupId) {
        if (!g.tabs.some(t => t.id === tabId)) {
          return { ...g, tabs: [...g.tabs, tabToAdd] };
        }
      }
      return g;
    });

    setTabGroups(updatedGroups.filter(g => g.tabs.length > 0 || g.isCustom));
    toast({title: t("tabAddedToGroup"), description: t("tabAddedToGroupDesc", { title: tabToAdd.title, groupName: tabGroups.find(g=>g.id === groupId)?.name || '' })});
  };


  const handleEditGroupName = (groupId: string, newName: string) => {
    setTabGroups(prevGroups => 
      prevGroups.map(g => 
        g.id === groupId ? {...g, name: newName, isCustom: true } : g 
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
  
      if (sourceType === 'group' && sourceGroupId) {
        const srcGroup = newGroups.find(g => g.id === sourceGroupId);
        if (srcGroup) {
          srcGroup.tabs = srcGroup.tabs.filter(t => t.id !== tabId);
        }
      }
  
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
  
    if (sourceType === 'ungrouped') return; 
  
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
        <Button onClick={handleSuggestTabGroups} disabled={isLoadingAI || ungroupedTabs.length === 0}>
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
                onAddTabToGroup={(groupId) => {
                    if (ungroupedTabs.length > 0) {
                        // Attempt to add the first ungrouped tab. A more sophisticated UI might allow choosing.
                        handleAddTabToGroup(groupId, ungroupedTabs[0].id);
                    } else {
                        toast({ title: t("noUngroupedTabs"), description: t("noUngroupedTabsDesc"), variant: "destructive"});
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
                onRemove={(tabId) => {
                  setTabs(prevTabs => prevTabs.filter(t => t.id !== tabId));
                  setTabGroups(prevGroups => 
                    prevGroups.map(group => ({
                      ...group,
                      tabs: group.tabs.filter(t => t.id !== tabId)
                    })).filter(group => group.tabs.length > 0 || group.isCustom) // Ensure custom groups persist even if empty
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


    