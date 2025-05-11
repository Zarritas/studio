
"use client";
import type { Tab } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  addTabsBatch: (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children, addTabsBatch }: { children: ReactNode; addTabsBatch: (tabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[]) => void; }) {
  return (
    <DashboardContext.Provider value={{ addTabsBatch }}>
      {children}
    </DashboardContext.Provider>
  );
}
