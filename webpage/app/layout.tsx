import './globals.css';
import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'pocketFlow | Log an expense in two taps',
  description:
    'A fast, offline money tracker for Android. Record expenses and income in a couple of taps, keep your data on your device, and download the APK.',
  openGraph: {
    title: 'pocketFlow | Log an expense in two taps',
    description: 'A fast, offline money tracker for Android.',
    url: 'https://pf.eiteone.org',
    locale: 'en_US',
    siteName: 'pocketFlow',
    type: 'website',
    images: [
      {
        url: '/assets/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'pocketFlow - offline money tracker',
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
      <body className="bg-white font-sans text-teal-900 antialiased">
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
