
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
      return; // Wait for authentication state to be determined
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

  if (pathname === '/login') {
    if (currentUser) {
      // User is logged in but useEffect hasn't redirected yet
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg">Đang chuyển hướng...</p>
        </div>
      );
    }
    // User is not logged in, render the login page
    return <>{children}</>;
  }

  // For protected routes
  if (!currentUser) {
    // User is not logged in, and useEffect will redirect. Show loading.
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    );
  }

  // User is logged in and not on the login page, render the main app layout
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
