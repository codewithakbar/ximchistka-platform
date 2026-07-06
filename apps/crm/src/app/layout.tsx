import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import { ThemedToaster } from '@/components/themed-toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CleanWay CRM',
  description: 'CleanWay boshqaruv paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <I18nProvider>
            {children}
            <ThemedToaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
