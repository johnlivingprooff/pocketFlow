import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import clsx from 'clsx';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'pocketFlow | Cash-flow-first personal finance system',
  description: 'pocketFlow is an offline-first personal finance tracker focused on cash flow clarity: multi-wallet tracking, categorized transactions, budgets, goals, and local receipts.',
  openGraph: {
    title: 'pocketFlow | Cash-flow-first personal finance system',
    description: 'Offline-first tracking for wallets, transactions, receipts, budgets, and goals—built for disciplined planners.',
    url: 'https://pocketflow.app',
    siteName: 'pocketFlow',
    type: 'website',
    images: [
      {
        url: '/assets/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'pocketFlow - Personal Finance Tracker',
      },
    ],
  },
  metadataBase: new URL('https://pocketflow.app'),
  icons: {
    icon: '/assets/logo.svg',
    apple: '/assets/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={clsx(inter.className, 'bg-ink-900 text-sand-100 antialiased')}>
        <Navigation />
        <div className="pt-16">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
