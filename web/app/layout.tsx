import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '../components/Shell';

export const metadata: Metadata = {
  title: 'pocketFlow — Shared Wallets',
  description: 'Shared wallets dashboard — liquid glass finance. Create, invite and track shared wallets with your team.',
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
