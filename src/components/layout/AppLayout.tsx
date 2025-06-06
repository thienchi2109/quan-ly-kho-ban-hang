
"use client";

import React, { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { useAuth } from '@/contexts/AuthContext'; // Corrected path to use alias, now that file will exist
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

    // If not loading and not logged in, and not on login page, redirect to login
    if (!currentUser && pathname !== '/login') {
      router.replace('/login');
    } 
    // If not loading and logged in, and on login page, redirect to dashboard
    else if (currentUser && pathname === '/login') {
      router.replace('/dashboard');
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

  // If on the login page
  if (pathname === '/login') {
    // If logged in while on login page (e.g. useEffect hasn't redirected yet), show loading
    if (currentUser) { 
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg">Đang chuyển hướng...</p>
        </div>
      );
    }
    // If not logged in and on login page, render children (the login page itself)
    return <>{children}</>; 
  }

  // If not on login page, and still not logged in (should have been caught by useEffect or middleware, but as a fallback)
  if (!currentUser) {
    // This state should ideally be brief as useEffect or middleware handles redirection
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    );
  }
  
  // If logged in and not on the login page, render the main app layout
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
