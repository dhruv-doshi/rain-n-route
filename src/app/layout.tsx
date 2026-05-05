import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { Header } from '@/components/shell/Header';
import { BottomNav } from '@/components/shell/BottomNav';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CommuteWise — Weather-Aware Trip Planner',
  description:
    'Plan your daily commute with real-time weather, multi-modal routes, and gear suggestions. India-first, no account required.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OfflineBanner />
          <Header />
          {/* pb-16 reserves space for the mobile bottom nav */}
          <main id="main-content" className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <BottomNav />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
