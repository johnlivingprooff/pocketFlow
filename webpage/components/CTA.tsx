'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function CTA() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`relative section-shell py-32 lg:py-40 overflow-hidden transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/assets/la-ferrari.jpg')] bg-cover bg-center" />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/80 via-ink-900/70 to-ink-900/90" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl lg:text-5xl font-bold text-sand-50">
          Take control of your finances
        </h2>
        <p className="text-xl text-sand-100">
          Start tracking your cash flow today. Offline-first, privacy-focused, built for clarity.
        </p>
        <div className="mt-4">
          <Link
            href="https://github.com/johnlivingprooff/pocketFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-gold-400 underline decoration-gold-400/60 underline-offset-4 hover:text-gold-300 transition-colors"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
