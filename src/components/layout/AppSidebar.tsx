
"use client";

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import AppSidebarNavigation from './AppSidebarNavigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function AppSidebar() {
  const { logout } = useAuth();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex h-24 flex-col items-center justify-center p-2 group-data-[collapsible=icon]:h-14">
            <Image
            src="https://i.postimg.cc/QdZWSSZ6/inventory-5858355.png"
            alt="App Logo"
            width={48}
            height={48}
            className="transition-all group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
            data-ai-hint="logo inventory"
            />
            <h1 className="mt-2 text-md font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                Quản Lý Bán Hàng
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
