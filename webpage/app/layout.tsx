import './globals.css';
import type { Metadata } from 'next';
import { Public_Sans, Sora } from 'next/font/google';
import clsx from 'clsx';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'pocketFlow | Trusted personal finance workflow',
  description:
    'pocketFlow is an offline-first finance tracker focused on trusted cash-flow tracking, on-device data ownership, and transparent analytics.',
  openGraph: {
    title: 'pocketFlow | Trusted personal finance workflow',
    description:
      'Track wallets, transactions, receipts, budgets, and goals with an offline-first model built for trust and clarity.',
    url: 'https://pf.eiteone.org',
    locale: 'en_US',
    siteName: 'pocketFlow',
    type: 'website',
    images: [
      {
        url: '/assets/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'pocketFlow - trusted personal finance workflow',
      },
    ],
  },
  metadataBase: new URL('https://pf.eiteone.org'),
  icons: {
    icon: '/assets/app_icon.png',
    apple: '/assets/app_icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={clsx(publicSans.variable, sora.variable, 'bg-[var(--bg-soft)] font-sans text-slate-900 antialiased')}>
        <Navigation />
        <div className="pt-20 sm:pt-24">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
