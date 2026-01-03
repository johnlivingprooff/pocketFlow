'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const featureItems = [
  {
    icon: '/assets/svgs/money.svg',
    label: 'Multi-wallet',
    detail: 'Track cash, mobile money, and bank accounts in one place',
  },
  {
    icon: '/assets/svgs/percentage-square.svg',
    label: 'Budgets',
    detail: 'Set spending limits per category with weekly or monthly periods',
  },
  {
    icon: '/assets/svgs/savings-hog.svg',
    label: 'Goals',
    detail: 'Savings targets with progress tracking and on-track signals',
  },
  {
    icon: '/assets/svgs/bill-svgrepo-com.svg',
    label: 'Receipts',
    detail: 'Store receipt images locally for offline access',
  },
  {
    icon: '/assets/svgs/safe.svg',
    label: 'Offline-first',
    detail: 'Your data lives on your device with optional biometric lock',
  },
  {
    icon: '/assets/svgs/stock-market-svgrepo-com.svg',
    label: 'Analytics',
    detail: 'Clear income vs expense breakdowns and wallet balances',
  },
];

export function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
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
      className={`py-16 section-shell lg:py-24 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      id="features"
    >
      <div className="flex flex-col items-center gap-4 mb-12 text-center">
        <h2 className="text-3xl font-bold lg:text-4xl text-sand-50">Built for clarity</h2>
        <p className="max-w-2xl text-base text-sand-300">
          Tap any feature to explore what makes pocketFlow different
        </p>
      </div>
      
      <div className="flex flex-col lg:grid lg:grid-cols-2 items-center gap-8 lg:gap-12">
        {/* Active Feature Detail - Shows first on mobile, second on desktop */}
        <div className="relative min-h-[200px] flex items-center justify-center w-full order-1 lg:order-2">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-600/10 to-transparent rounded-3xl" />
          <div className="relative z-10 p-8 lg:p-12">
            <div className="flex flex-col gap-6 duration-500 animate-in fade-in">
              <div className="relative w-24 h-24 mx-auto lg:mx-0">
                <Image
                  src={featureItems[activeIndex].icon}
                  alt={featureItems[activeIndex].label}
                  fill
                  className="object-contain brightness-110 invert"
                />
              </div>
              <div className="flex flex-col gap-3 text-center lg:text-left">
                <h3 className="text-2xl font-bold lg:text-3xl text-gold-500">
                  {featureItems[activeIndex].label}
                </h3>
                <p className="text-lg leading-relaxed text-sand-100">
                  {featureItems[activeIndex].detail}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Icons Grid - Shows second on mobile, first on desktop */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full order-2 lg:order-1">
          {featureItems.map((feature, index) => (
            <button
              key={feature.label}
              onClick={() => setActiveIndex(index)}
              className={`group relative flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-2xl transition-all duration-300 ${
                activeIndex === index
                  ? 'bg-gold-600/20 ring-2 ring-gold-600 scale-105'
                  : 'bg-ink-800/50 hover:bg-ink-800 hover:scale-102'
              }`}
            >
              <div
                className={`relative w-12 h-12 sm:w-16 sm:h-16 transition-transform duration-300 ${
                  activeIndex === index ? 'scale-110' : 'group-hover:scale-105'
                }`}
              >
                <Image
                  src={feature.icon}
                  alt={feature.label}
                  fill
                  className={`object-contain transition-all duration-300 invert ${
                    activeIndex === index
                      ? 'brightness-125 saturate-150'
                      : 'brightness-90 opacity-80 group-hover:brightness-110 group-hover:opacity-100'
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold transition-colors ${
                  activeIndex === index ? 'text-gold-500' : 'text-sand-200 group-hover:text-sand-50'
                }`}
              >
                {feature.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
