import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '../components/Shell';

export const metadata: Metadata = {
  title: 'pocketFlow — Shared Wallets',
  description: 'Shared wallets dashboard — liquid glass finance. Create, invite and track shared wallets with your team.',
  metadataBase: new URL('https://pf.eiteone.org'),
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/assets/app_icon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/assets/app_icon.png' },
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'pocketFlow — Shared Wallets',
    description: 'Shared wallets dashboard — liquid glass finance. Create, invite and track shared wallets with your team.',
    url: 'https://pf.eiteone.org',
    siteName: 'pocketFlow',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/assets/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'pocketFlow - shared wallets dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pocketFlow — Shared Wallets',
    description: 'Shared wallets dashboard — liquid glass finance.',
    images: ['/assets/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist-50 antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
