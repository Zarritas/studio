
import type { ReactNode } from 'react';
import { MainHeader } from '@/components/layout/main-header';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardProvider } from '@/contexts/DashboardContext';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <SidebarProvider defaultOpen={true}>
        <MainSidebar />
        <SidebarInset>
          <MainHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProvider>
  );
}
