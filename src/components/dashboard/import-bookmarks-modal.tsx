
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bookmark, AlertTriangle, Loader2, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useDashboardContext } from '@/contexts/DashboardContext';
import type { Tab, chrome } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkTreeItem } from './bookmark-tree-item'; 

interface ImportBookmarksModalProps {
  triggerButton: ReactNode;
}

export function ImportBookmarksModal({ triggerButton }: ImportBookmarksModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const { t } = useTranslation();
  const { toast } = useToast();
  const { addTabsBatch, createGroupsWithTabsBatch } = useDashboardContext();

  const fetchBookmarks = useCallback(() => {
    if (typeof window.chrome === "undefined" || typeof window.chrome.bookmarks === "undefined") {
      setApiError(t('importBookmarksModal.apiUnavailable.description'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setApiError(null);
    try {
      window.chrome.bookmarks.getTree((results) => {
        if (window.chrome.runtime?.lastError) {
          setApiError(window.chrome.runtime.lastError.message || t('importBookmarksModal.fetchError'));
          console.error("Error fetching bookmarks:", window.chrome.runtime.lastError.message);
        } else {
          setBookmarkTree(results);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Exception fetching bookmarks:", error);
      setApiError((error as Error).message || t('importBookmarksModal.fetchError'));
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) {
      fetchBookmarks();
      setSelectedItems({}); // Reset selections when modal opens
    }
  }, [isOpen, fetchBookmarks]);

  const handleToggleSelected = useCallback((id: string, isFolder: boolean, childrenIds?: string[]) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      const currentSelectionState = !prev[id];
      newSelected[id] = currentSelectionState;

      if (isFolder && childrenIds) {
        const propagateSelection = (itemId: string, select: boolean) => {
           const node = findNodeById(bookmarkTree, itemId);
           if (node) {
             newSelected[itemId] = select;
             if(node.children){
                node.children.forEach(child => propagateSelection(child.id, select));
             }
           }
        };
        // When a folder is selected/deselected, propagate to all its descendants
        const folderNode = findNodeById(bookmarkTree, id);
        if(folderNode && folderNode.children){
            folderNode.children.forEach(child => propagateSelection(child.id, currentSelectionState));
        }
      }
      
      // Optional: Update parent folder state if all children are selected/deselected (complex, skip for now for simplicity)
      return newSelected;
    });
  }, [bookmarkTree]);

  const findNodeById = (nodes: chrome.bookmarks.BookmarkTreeNode[], id: string): chrome.bookmarks.BookmarkTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  const getSelectedData = (): { 
    tabsToImport: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[], 
    groupsToCreate: { name: string, tabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] }[] 
  } => {
    const tabsToImport: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] = [];
    const groupsToCreate: { name: string, tabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] }[] = [];
    const processedFolderIds = new Set<string>();

    function collectFromNode(node: chrome.bookmarks.BookmarkTreeNode, currentPathIsSelectedFolder: boolean) {
      const isSelected = selectedItems[node.id];
      
      if (node.url && (isSelected || currentPathIsSelectedFolder)) { // It's a bookmark
        if (!isFolderSelectedAncestor(node.parentId)) { // Only add if not part of an already selected folder
             tabsToImport.push({ title: node.title || new URL(node.url).hostname, url: node.url });
        }
      } else if (node.children) { // It's a folder
        if (isSelected && !processedFolderIds.has(node.id)) {
          processedFolderIds.add(node.id);
          const groupTabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] = [];
          
          function collectTabsForGroup(folderNode: chrome.bookmarks.BookmarkTreeNode) {
            if (folderNode.url) {
              groupTabs.push({ title: folderNode.title || new URL(folderNode.url).hostname, url: folderNode.url });
            }
            if (folderNode.children) {
              folderNode.children.forEach(collectTabsForGroup);
            }
          }
          collectTabsForGroup(node);
          if (groupTabs.length > 0) {
            groupsToCreate.push({ name: node.title || 'Imported Group', tabs: groupTabs });
          }
        } else if (node.children) { // If folder itself not selected, recurse its children
          node.children.forEach(child => collectFromNode(child, currentPathIsSelectedFolder || isSelected));
        }
      }
    }

    // Helper to check if any ancestor folder of a bookmark was selected for import as a group
    function isFolderSelectedAncestor(parentId?: string): boolean {
        if (!parentId) return false;
        const parentNode = findNodeById(bookmarkTree, parentId);
        if (parentNode && selectedItems[parentNode.id] && parentNode.children) { // Parent folder is selected
            return true;
        }
        if (parentNode && parentNode.parentId) {
            return isFolderSelectedAncestor(parentNode.parentId);
        }
        return false;
    }

    bookmarkTree.forEach(rootNode => {
      if (rootNode.children) { // Typically, rootNode is "0", its children are "Bookmarks Bar", "Other Bookmarks"
        rootNode.children.forEach(node => collectFromNode(node, false));
      }
    });
    
    return { tabsToImport, groupsToCreate };
  };


  const handleImport = () => {
    if (!addTabsBatch || !createGroupsWithTabsBatch) {
      toast({ title: t('error'), description: t('featureNotReadyDescription'), variant: 'destructive' });
      return;
    }
    const { tabsToImport, groupsToCreate } = getSelectedData();

    let importedCount = 0;
    if (tabsToImport.length > 0) {
      addTabsBatch(tabsToImport);
      importedCount += tabsToImport.length;
    }
    if (groupsToCreate.length > 0) {
      createGroupsWithTabsBatch(groupsToCreate);
      importedCount += groupsToCreate.reduce((sum, group) => sum + group.tabs.length, 0);
      importedCount += groupsToCreate.length; // For the groups themselves
    }

    if (importedCount > 0) {
      toast({ title: t('importBookmarksModal.success.title'), description: t('importBookmarksModal.success.description', { count: importedCount }) });
    } else {
      toast({ title: t('importBookmarksModal.noSelection.title'), description: t('importBookmarksModal.noSelection.description') });
    }
    setIsOpen(false);
  };
  
  const renderTree = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    return nodes.map(node => (
      <BookmarkTreeItem 
        key={node.id} 
        node={node} 
        selectedItems={selectedItems}
        onToggleSelected={handleToggleSelected}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('importBookmarksModal.title')}</DialogTitle>
          <DialogDescription>{t('importBookmarksModal.description')}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">{t('importBookmarksModal.loading')}</p>
          </div>
        )}

        {apiError && !isLoading && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !apiError && bookmarkTree.length === 0 && (
            <p className="text-muted-foreground text-center py-10">{t('importBookmarksModal.noBookmarksFound')}</p>
        )}
        
        {!isLoading && !apiError && bookmarkTree.length > 0 && (
          <ScrollArea className="flex-grow my-4 border rounded-md p-2 min-h-[300px]">
            {renderTree(bookmarkTree)}
          </ScrollArea>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={isLoading || apiError || Object.keys(selectedItems).length === 0}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {t('importBookmarksModal.importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
