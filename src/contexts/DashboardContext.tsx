"use client";
import type { Tab } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useRef, useCallback } from 'react';

// Functions will be implemented in DashboardPage and registered here.
// They will have access to currentUser from DashboardPage's scope.
type AddTabsBatchFn = (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => Promise<void>;
type CreateGroupsWithTabsBatchFn = (groupsData: { name: string, tabs: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] }[]) => Promise<void>;

interface DashboardContextType {
  addTabsBatch: AddTabsBatchFn; // Changed to non-nullable, will provide a stable caller
  registerAddTabsBatch: (fn: AddTabsBatchFn | null) => void;
  createGroupsWithTabsBatch: CreateGroupsWithTabsBatchFn; // Changed to non-nullable
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
  const addTabsBatchFnRef = useRef<AddTabsBatchFn | null>(null);
  const createGroupsWithTabsBatchFnRef = useRef<CreateGroupsWithTabsBatchFn | null>(null);

  const registerAddTabsBatch = useCallback((fn: AddTabsBatchFn | null) => {
    addTabsBatchFnRef.current = fn;
  }, []); // Empty dependency array ensures this function is stable

  const registerCreateGroupsWithTabsBatch = useCallback((fn: CreateGroupsWithTabsBatchFn | null) => {
    createGroupsWithTabsBatchFnRef.current = fn;
  }, []); // Empty dependency array ensures this function is stable

  // Stable caller function for addTabsBatch
  const callAddTabsBatch: AddTabsBatchFn = useCallback(async (tabsData) => {
    if (addTabsBatchFnRef.current) {
      await addTabsBatchFnRef.current(tabsData);
    } else {
      console.warn('addTabsBatch function not registered in DashboardContext');
      // Optionally, return a rejected promise or throw an error
      // return Promise.reject(new Error('addTabsBatch function not registered'));
    }
  }, []); // Empty dependency array ensures this function is stable

  // Stable caller function for createGroupsWithTabsBatch
  const callCreateGroupsWithTabsBatch: CreateGroupsWithTabsBatchFn = useCallback(async (groupsData) => {
    if (createGroupsWithTabsBatchFnRef.current) {
      await createGroupsWithTabsBatchFnRef.current(groupsData);
    } else {
      console.warn('createGroupsWithTabsBatch function not registered in DashboardContext');
      // Optionally, return a rejected promise or throw an error
    }
  }, []); // Empty dependency array ensures this function is stable

  return (
    <DashboardContext.Provider value={{ 
      addTabsBatch: callAddTabsBatch, 
      registerAddTabsBatch,
      createGroupsWithTabsBatch: callCreateGroupsWithTabsBatch,
      registerCreateGroupsWithTabsBatch
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
