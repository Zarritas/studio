"use client";
import type { Tab } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';

type AddTabsBatchFn = (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => void;

interface DashboardContextType {
  addTabsBatch: AddTabsBatchFn | null;
  registerAddTabsBatch: (fn: AddTabsBatchFn | null) => void;
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

  const registerAddTabsBatch = useCallback((fn: AddTabsBatchFn | null) => {
    setAddTabsBatchFn(() => fn);
  }, []);

  return (
    <DashboardContext.Provider value={{ addTabsBatch: addTabsBatchFn, registerAddTabsBatch }}>
      {children}
    </DashboardContext.Provider>
  );
}