"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppSidebarNavigation from "./AppSidebarNavigation";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks";
import { useSidebar } from "@/components/ui/sidebar"; // Corrected import path

export default function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs bg-sidebar text-sidebar-foreground p-0">
             <div className="flex h-14 items-center border-b border-sidebar-border px-4">
                <h1 className="text-lg font-semibold text-sidebar-foreground">QUẢN LÝ KHO</h1>
              </div>
            <AppSidebarNavigation />
          </SheetContent>
        </Sheet>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}
      <div className="flex-1">
        {/* Can add breadcrumbs or page title here if needed */}
      </div>
      {/* Add User Menu or other header items here */}
    </header>
  );
}
