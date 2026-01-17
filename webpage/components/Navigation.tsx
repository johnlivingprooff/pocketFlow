'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex justify-center px-2 pointer-events-none sm:px-0">
      <div
        className={`relative transition-[width,transform,border-radius] duration-50 ease-out pointer-events-auto ${isScrolled
            ? 'w-full translate-y-0 rounded-none'
            : 'w-[95%] sm:w-3/4 max-w-5xl translate-y-3 rounded-full'
          }`}
      >
        {/* Blur background */}
        <div
          className={`absolute inset-0 backdrop-blur-lg bg-gold-900/80 transition-[border-radius,backdrop-filter,background-color] duration-50 ease-out ${isScrolled ? 'rounded-none' : 'rounded-full'
            }`}
        />

        {/* Content */}
        <div className="relative flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src="/assets/sp_icon.png" alt="pocketFlow" width={100} height={30} className="h-[30px] w-auto sm:h-[30px]" />
            {!isScrolled && <span className="hidden text-xs font-semibold sm:text-sm text-sand-50 xs:inline">pocketFlow</span>}
          </Link>
          <a
            href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors rounded-full bg-sand-50 text-ink-900 hover:bg-sand-200 shadow-sm"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-[14px] sm:h-[14px]">
              <path d="M8 0L10.5 5.5L16 6.5L12 10.5L13 16L8 13L3 16L4 10.5L0 6.5L5.5 5.5L8 0Z" fill="currentColor" />
            </svg>
            <span className="hidden xs:inline">See Releases</span>
            <span className="xs:hidden">Releases</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
