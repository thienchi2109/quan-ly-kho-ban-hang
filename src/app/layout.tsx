
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { DataProvider } from '@/contexts/DataContext';
import { AuthProvider } from '@/contexts/AuthContext'; // Added AuthProvider
import AppLayout from '@/components/layout/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QUẢN LÝ KHO - THU CHI',
  description: 'Ứng dụng quản lý kho và thu chi cá nhân/doanh nghiệp nhỏ',
  manifest: '/manifest.json', // Link to the manifest file
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Standard Next.js font handling does not require manual <link> tags for Google Fonts when using next/font */}
        <meta name="application-name" content="CashFlow Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CashFlow" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" /> 
        <meta name="msapplication-TileColor" content="#4db6ac" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#4db6ac" />

        {/* 
          IMPORTANT: Replace these placeholder icons with your actual icon files.
          Place your icon files in the /public/icons/ directory.
          Example: /public/icons/apple-touch-icon-180x180.png
        */}
        <link rel="apple-touch-icon" href="https://i.postimg.cc/ZRyq40K6/favicon-96x96.png" /> 
        <link rel="apple-touch-icon" sizes="152x152" href="https://i.postimg.cc/zGjbcLVB/web-app-manifest-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://i.postimg.cc/zGjbcLVB/web-app-manifest-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="https://i.postimg.cc/zGjbcLVB/web-app-manifest-192x192.png" />

        {/* Favicon links - replace with your actual favicons in /public/icons/ */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        
        {/* Safari Pinned Tab Icon - Uncomment and provide your SVG icon if you have one */}
        {/* <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#4db6ac" /> */}

      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <DataProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster />
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
