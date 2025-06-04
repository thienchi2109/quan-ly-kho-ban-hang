"use client";

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import AppSidebarNavigation from './AppSidebarNavigation';
import { Package2 } from 'lucide-react';

export default function AppSidebar() {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-14 items-center px-4">
          <Package2 className="h-6 w-6 mr-2 text-sidebar-primary" />
          <h1 className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            QUẢN LÝ KHO
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <AppSidebarNavigation />
      </SidebarContent>
      <SidebarFooter className="mt-auto p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          &copy; {new Date().getFullYear()}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
