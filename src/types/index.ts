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
