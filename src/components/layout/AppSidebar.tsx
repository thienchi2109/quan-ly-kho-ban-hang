
"use client";

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import AppSidebarNavigation from './AppSidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut, Package2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function AppSidebar() {
  const { logout } = useAuth(); // Get logout function

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
      <SidebarFooter className="mt-auto p-2 border-t border-sidebar-border">
        {/* Logout Button */}
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2 group-data-[collapsible=icon]:hidden">Đăng xuất</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
