
"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"; // SidebarTrigger for desktop, useSidebar for mobile state
import { Button } from "@/components/ui/button";
// Removed Sheet, SheetContent, SheetTrigger as ShadcnSheetTrigger from here as AppHeader won't define its own sheet.
// The Sheet is managed by the Sidebar component from @/components/ui/sidebar based on isMobile and openMobile state.
import AppSidebarNavigation from "./AppSidebarNavigation"; // This import was unused here, potentially for an old structure. Removing if truly unused by AppHeader directly.
import { PanelLeft } from "lucide-react";

export default function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {isMobile ? (
        // This button now correctly calls toggleSidebar which manages the 'openMobile' state
        // for the Sheet rendered by the main Sidebar component.
        <Button 
          size="icon" 
          variant="outline" 
          className="sm:hidden" 
          onClick={toggleSidebar}
          aria-label="Toggle Menu"
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      ) : (
        // This is the desktop sidebar trigger (e.g., to collapse/expand if collapsible="icon" on desktop)
        <SidebarTrigger className="hidden md:flex" />
      )}
      <div className="flex-1">
        {/* Can add breadcrumbs or page title here if needed */}
      </div>
      {/* Add User Menu or other header items here */}
    </header>
  );
}

