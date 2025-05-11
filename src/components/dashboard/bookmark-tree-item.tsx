
"use client";

import type { ReactNode } from 'react';
import React from 'react';
import type { chrome } from '@/types'; // Using global chrome namespace
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Folder, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookmarkTreeItemProps {
  node: chrome.bookmarks.BookmarkTreeNode;
  selectedItems: Record<string, boolean>;
  onToggleSelected: (id: string, isFolder: boolean, childrenIds?: string[]) => void;
  level?: number;
}

export function BookmarkTreeItem({ 
  node, 
  selectedItems, 
  onToggleSelected, 
  level = 0 
}: BookmarkTreeItemProps): ReactNode {
  const isFolder = !!node.children;
  const isSelected = selectedItems[node.id] || false;

  const handleToggle = () => {
    let childrenIds: string[] | undefined;
    if (isFolder && node.children) {
      childrenIds = [];
      const collectChildrenIds = (currentNode: chrome.bookmarks.BookmarkTreeNode) => {
        childrenIds!.push(currentNode.id);
        if (currentNode.children) {
          currentNode.children.forEach(collectChildrenIds);
        }
      };
      node.children.forEach(collectChildrenIds);
    }
    onToggleSelected(node.id, isFolder, childrenIds);
  };
  
  // Skip rendering the root node (id "0") itself, but render its children.
  // Also skip "Bookmarks Bar", "Other Bookmarks", "Mobile Bookmarks" if they are direct children of root.
  // These are usually system folders. We want their content.
  const systemFolderIds = ["1", "2", "3"]; // Common IDs for Bookmarks Bar, Other, Mobile
  if (node.id === "0" || (node.parentId === "0" && systemFolderIds.includes(node.id) && !node.url)) {
    return (
      <>
        {node.children?.map(child => (
          <BookmarkTreeItem
            key={child.id}
            node={child}
            selectedItems={selectedItems}
            onToggleSelected={onToggleSelected}
            level={level} // Keep level same for children of these skipped roots
          />
        ))}
      </>
    );
  }


  return (
    <div className="flex flex-col" style={{ paddingLeft: `${level * 1.25}rem` }}>
      <div className="flex items-center space-x-2 py-1 hover:bg-muted/50 rounded-md px-2">
        <Checkbox
          id={`bookmark-${node.id}`}
          checked={isSelected}
          onCheckedChange={handleToggle}
        />
        {isFolder ? <Folder className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4 text-accent" />}
        <Label 
            htmlFor={`bookmark-${node.id}`} 
            className={cn("cursor-pointer text-sm flex-grow truncate", isSelected ? "font-medium" : "")}
            title={node.title + (node.url ? ` (${node.url})` : '')}
        >
          {node.title || (node.url ? new URL(node.url).hostname : 'Untitled')}
        </Label>
      </div>
      {isFolder && node.children && (
        <div className="mt-1">
          {node.children.map(child => (
            <BookmarkTreeItem
              key={child.id}
              node={child}
              selectedItems={selectedItems}
              onToggleSelected={onToggleSelected}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
