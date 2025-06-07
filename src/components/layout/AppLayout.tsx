
"use client";

import React, { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
// import { useAuth } from '@/contexts/AuthContext'; // No longer strictly needed for redirection logic here
// import { usePathname, useRouter } from 'next/navigation'; // No longer strictly needed for redirection logic here
// import { Loader2 } from 'lucide-react'; // No longer strictly needed for loading state here

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // const { currentUser, loadingAuth } = useAuth(); // Temporarily disabled
  // const pathname = usePathname(); // Temporarily disabled
  // const router = useRouter(); // Temporarily disabled

  // useEffect(() => { // Temporarily disable auth checks and redirects
  //   if (loadingAuth) {
  //     return; 
  //   }
  //   if (currentUser && pathname === '/login') {
  //     router.replace('/dashboard');
  //   } else if (!currentUser && pathname !== '/login') {
  //     router.replace('/login');
  //   }
  // }, [currentUser, loadingAuth, pathname, router]);

  // if (loadingAuth) { // Temporarily disable loading screen based on auth
  //   return (
  //     <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
  //       <Loader2 className="h-10 w-10 animate-spin text-primary" />
  //       <p className="ml-3 text-lg">Đang xác thực...</p>
  //     </div>
  //   );
  // }

  // if (pathname === '/login') { // Temporarily allow direct access to login page if needed, or remove this block
  //   return <>{children}</>;
  // }

  // Render the main app layout directly without auth checks
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset> {/* This is the <main> tag */}
        <AppHeader />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

