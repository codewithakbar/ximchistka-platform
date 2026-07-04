import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CleanWay — Ximchistka biznesi uchun CRM platforma',
  description:
    "Kimyoviy tozalash korxonalari uchun tayyor CRM: buyurtmalar, mijozlar, filiallar va moliya bitta panelda. 14 kun bepul sinov — karta talab qilinmaydi.",
  keywords: ['ximchistka CRM', 'kimyo tozalash', 'dry cleaning CRM', 'CleanWay', 'biznes platforma'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'CleanWay', statusBarStyle: 'default' },
  openGraph: {
    title: 'CleanWay — Ximchistka biznesi uchun CRM platforma',
    description: "Buyurtmalar, mijozlar va moliya bitta panelda. 14 kun bepul sinov — karta talab qilinmaydi.",
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
