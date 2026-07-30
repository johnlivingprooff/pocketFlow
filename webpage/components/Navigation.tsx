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
        className={`pointer-events-auto relative transition-[width,transform,border-radius] duration-300 ease-out ${
          isScrolled
            ? 'w-full translate-y-0 rounded-none'
            : 'w-[95%] sm:w-4/5 max-w-6xl translate-y-3 rounded-[9999px]'
        }`}
      >
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            isScrolled
              ? 'bg-white/70 backdrop-blur-xl'
              : 'bg-transparent backdrop-blur-xl'
          }`}
        />

        <div className="relative flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3">
          <Link href="/" className="flex items-center rounded-lg px-1 py-1">
            <Image
              src="/assets/app_icon.png"
              alt="pocketFlow"
              width={128}
              height={32}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:text-slate-900"
              >
                <span className="relative z-10">{item.label}</span>
                <span className="absolute inset-0 rounded-full bg-slate-900/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </a>
            ))}
          </div>

          <a
            href={betaWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-forest-700 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_-2px_rgba(61,100,32,0.3)] transition-all duration-300 hover:bg-forest-600 hover:shadow-[0_8px_24px_-4px_rgba(61,100,32,0.4)] hover:-translate-y-0.5 sm:text-sm"
          >
            Join Beta
          </a>
        </div>
      </div>
    </nav>
  );
}