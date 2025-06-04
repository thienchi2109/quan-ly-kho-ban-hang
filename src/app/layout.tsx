import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { DataProvider } from '@/contexts/DataContext';
import AppLayout from '@/components/layout/AppLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'QUẢN LÝ KHO - THU CHI',
  description: 'Ứng dụng quản lý kho và thu chi cá nhân/doanh nghiệp nhỏ',
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
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <DataProvider>
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
