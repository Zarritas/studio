
"use client";
import type { Tab } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';

// Functions will be implemented in DashboardPage and registered here.
// They will have access to currentUser from DashboardPage's scope.
type AddTabsBatchFn = (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => Promise<void>;
type CreateGroupsWithTabsBatchFn = (groupsData: { name: string, tabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] }[]) => Promise<void>;

interface DashboardContextType {
  addTabsBatch: AddTabsBatchFn | null;
  registerAddTabsBatch: (fn: AddTabsBatchFn | null) => void;
  createGroupsWithTabsBatch: CreateGroupsWithTabsBatchFn | null;
  registerCreateGroupsWithTabsBatch: (fn: CreateGroupsWithTabsBatchFn | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [addTabsBatchFn, setAddTabsBatchFn] = useState<AddTabsBatchFn | null>(null);
  const [createGroupsWithTabsBatchFn, setCreateGroupsWithTabsBatchFn] = useState<CreateGroupsWithTabsBatchFn | null>(null);

  const registerAddTabsBatch = useCallback((fn: AddTabsBatchFn | null) => {
    setAddTabsBatchFn(() => fn); // Pass async function
  }, []);

  const registerCreateGroupsWithTabsBatch = useCallback((fn: CreateGroupsWithTabsBatchFn | null) => {
    setCreateGroupsWithTabsBatchFn(() => fn); // Pass async function
  }, []);

  return (
    <DashboardContext.Provider value={{ 
      addTabsBatch: addTabsBatchFn, 
      registerAddTabsBatch,
      createGroupsWithTabsBatch: createGroupsWithTabsBatchFn,
      registerCreateGroupsWithTabsBatch
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
