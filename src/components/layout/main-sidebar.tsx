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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Settings, UploadCloud, Bookmark, Info, LogOut, Layers3 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const importNavItems = [
  { label: 'Import Active Tabs', icon: UploadCloud, action: () => alert('Import Active Tabs (Not Implemented)') },
  { label: 'Import Bookmarks', icon: Bookmark, action: () => alert('Import Bookmarks (Not Implemented)') },
];


export function MainSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold group-data-[collapsible=icon]:hidden">
           <Layers3 className="h-6 w-6 text-primary" />
           <span>TabWise</span>
        </Link>
         <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full hidden">
           <Layers3 className="h-6 w-6 text-primary" />
        </div>
        <SidebarTrigger className="md:hidden"/>
      </SidebarHeader>

      <ScrollArea className="flex-1">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarMenu>
              {importNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton onClick={item.action} tooltip={item.label}>
                    <item.icon /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </ScrollArea>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Log Out">
                    <LogOut /> <span>Log Out</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
