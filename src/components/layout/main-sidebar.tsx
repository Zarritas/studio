
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Settings, UploadCloud, Bookmark, LogOut, Layers3 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTranslation } from '@/lib/i18n';
import { ImportActiveTabsModal } from '@/components/dashboard/import-active-tabs-modal';
import { ImportBookmarksModal } from '@/components/dashboard/import-bookmarks-modal';


export function MainSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useTranslation();

  const mainNavItems = [
    { href: '/dashboard', label: t('dashboard'), icon: Home },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];
  
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold group-data-[collapsible=icon]:hidden">
           <Layers3 className="h-6 w-6 text-primary" />
           <span>{t('tabwise')}</span>
        </Link>
         <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full hidden">
           <Layers3 className="h-6 w-6 text-primary" />
        </div>
        <SidebarTrigger className="md:hidden"/>
      </SidebarHeader>

      <ScrollArea className="flex-1">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('navigation', {defaultValue: 'Navigation'})}</SidebarGroupLabel>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <a><item.icon /><span>{item.label}</span></a>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{t('tools', {defaultValue: 'Tools'})}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <ImportActiveTabsModal
                  triggerButton={
                    <SidebarMenuButton tooltip={t('importActiveTabs', { defaultValue: 'Import active tabs' })}>
                      <UploadCloud /><span>{t('importActiveTabs')}</span>
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <ImportBookmarksModal
                  triggerButton={
                    <SidebarMenuButton tooltip={t('importBookmarks', { defaultValue: 'Import bookmarks' })}>
                      <Bookmark /><span>{t('importBookmarks')}</span>
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </ScrollArea>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip={t('logout', { defaultValue: 'Logout' })}>
                    <LogOut /> <span>{t('logout')}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
