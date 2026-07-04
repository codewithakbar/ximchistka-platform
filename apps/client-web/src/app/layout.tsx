import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CleanWay — Onlayn kimyo tozalash | Ximchistka platformasi',
  description:
    "Telefondan ximchistka buyurtma bering — kuryer olib ketadi, 24 soat ichida toza kiyimingizni yetkazib beramiz. Biznes uchun tayyor CRM: 14 kun bepul demo.",
  keywords: ['ximchistka', 'kimyo tozalash', 'dry cleaning', 'Toshkent', 'CleanWay', 'CRM'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'CleanWay', statusBarStyle: 'default' },
  openGraph: {
    title: 'CleanWay — Onlayn kimyo tozalash',
    description: "Telefondan buyurtma bering, 24 soat ichida toza kiyim. Biznes uchun 14 kun bepul CRM demo.",
    url: 'https://cleanway.4mi.uz',
    siteName: 'CleanWay',
    locale: 'uz_UZ',
    type: 'website',
  },
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
