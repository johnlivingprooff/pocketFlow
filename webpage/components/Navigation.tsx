'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { navigationLinks } from '@/lib/content';
import { betaWhatsappUrl } from '@/lib/links';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-2 sm:px-0">
      <div
        className={`pointer-events-auto relative transition-[width,transform,border-radius] duration-200 ease-out ${
          isScrolled
            ? 'w-full translate-y-0 rounded-none'
            : 'w-[95%] sm:w-4/5 max-w-6xl translate-y-3 rounded-full'
        }`}
      >
        <div
          className={`absolute inset-0 border border-slate-300/55 bg-white/24 backdrop-blur-xl transition-[border-radius] duration-200 ${
            isScrolled ? 'rounded-none' : 'rounded-full'
          }`}
        />

        <div className="relative flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3">
          <Link href="/" className="flex items-center rounded-lg px-1 py-1">
            <Image src="/assets/logo.png" alt="pocketFlow" width={128} height={32} className="h-7 w-auto sm:h-8" priority />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </div>

          <a
            href={betaWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-white sm:text-sm"
          >
            Join Beta
          </a>
        </div>
      </div>
    </nav>
  );
}
