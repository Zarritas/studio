
export interface Tab {
  id: string;
  title: string;
  url: string;
  faviconUrl?: string;
  lastAccessed?: number; // Timestamp
  isPlaceholder?: boolean; // For manually added tabs that might not have full chrome.tab data
}

export interface TabGroup {
  id: string;
  name: string;
  tabs: Tab[];
  color?: string; // Optional color for the group
  isCustom?: boolean; // Flag if group was created by user or AI
}

// Add type definitions for chrome APIs
// This is a simplified version. For full types, you might consider @types/chrome.
declare global {
  interface Window {
    chrome?: {
      tabs?: {
        query: (
          queryInfo: chrome.tabs.QueryInfo,
          callback: (tabs: chrome.tabs.Tab[]) => void
        ) => void;
      };
      runtime?: {
        lastError?: {
          message?: string;
        };
      };
      bookmarks?: {
        getTree: (callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => void;
      };
    };
  }

  namespace chrome.tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      openerTabId?: number;
      selected: boolean;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: MutedInfo;
      url?: string;
      pendingUrl?: string;
      title?: string;
      favIconUrl?: string;
      status?: TabStatus;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
      groupId?: number;
    }

    interface QueryInfo {
      active?: boolean;
      pinned?: boolean;
      audible?: boolean;
      muted?: boolean;
      highlighted?: boolean;
      discarded?: boolean;
      autoDiscardable?: boolean;
      currentWindow?: boolean;
      lastFocusedWindow?: boolean;
      status?: TabStatus;
      title?: string;
      url?: string | string[];
      windowId?: number;
      windowType?: WindowType;
      index?: number;
      groupId?: number;
    }

    interface MutedInfo {
      muted: boolean;
      reason?: MutedInfoReason;
      extensionId?: string;
    }

    type TabStatus = "loading" | "complete";
    type WindowType = "normal" | "popup" | "panel" | "app" | "devtools";
    type MutedInfoReason = "user" | "capture" | "extension";
  }

  namespace chrome.bookmarks {
    interface BookmarkTreeNode {
      id: string;
      parentId?: string;
      index?: number;
      url?: string;
      title: string;
      dateAdded?: number;
      dateGroupModified?: number;
      unmodifiable?: "managed";
      children?: BookmarkTreeNode[];
    }
  }
}
