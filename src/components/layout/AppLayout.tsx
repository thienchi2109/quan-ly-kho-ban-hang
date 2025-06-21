
"use client";

import React, { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, loadingAuth } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loadingAuth) {
      return; 
    }
    if (currentUser && pathname === '/login') {
      router.replace('/dashboard');
    } else if (!currentUser && pathname !== '/login') {
      router.replace('/login');
    }
  }, [currentUser, loadingAuth, pathname, router]);

  if (loadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang xác thực...</p>
      </div>
    );
  }
  
  // If not logged in and not on the login page, the useEffect above will redirect.
  // This prevents rendering the main layout for unauthenticated users on protected pages.
  if (!currentUser && pathname !== '/login') {
    return ( // Render a loading screen while redirecting
       <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang chuyển hướng...</p>
      </div>
    );
  }

  // If on login page, render only the children (the login page itself)
  if (pathname === '/login') {
    return <>{children}</>;
  }


  // Render the main app layout for authenticated users
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
