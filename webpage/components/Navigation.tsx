'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-ink-900/80 border-b border-ink-700">
      <div className="section-shell py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/assets/logo.svg" alt="pocketFlow" width={32} height={32} />
          <span className="text-lg font-semibold text-sand-50">pocketFlow</span>
        </Link>
        <Link
          href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-600 text-sand-50 font-medium hover:bg-gold-500 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0L10.5 5.5L16 6.5L12 10.5L13 16L8 13L3 16L4 10.5L0 6.5L5.5 5.5L8 0Z" fill="currentColor"/>
          </svg>
          Latest Release
        </Link>
      </div>
    </nav>
  );
}
