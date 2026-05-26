import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ximchistka — Onlayn kimyo tozalash',
  description: 'Telefoningizdan ximchistka buyurtma bering',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Ximchistka', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable}>
      <body className="font-sans">
        <PwaRegister />
        <div className="min-h-screen bg-background">{children}</div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
