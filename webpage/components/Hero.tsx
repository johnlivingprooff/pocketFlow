'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { hero } from '@/lib/content';

type Spot = { x: number; y: number };

const DEFAULT_SPOT: Spot = { x: 72, y: 24 };

export function Hero() {
  const [spot, setSpot] = useState<Spot>(DEFAULT_SPOT);
  const [activeMetric, setActiveMetric] = useState(0);

  const handleMove = (event: React.MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setSpot({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <section
      className="relative overflow-hidden pt-24 sm:pt-28 lg:pt-32"
      onMouseMove={handleMove}
      onMouseLeave={() => setSpot(DEFAULT_SPOT)}
    >
      <div className="absolute inset-0 -z-20">
        <Image
          src="/assets/wealth-journal.jpg"
          alt="wealth journal planning background"
          fill
          className="object-cover opacity-34"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f8fbff] via-[#f2f7fd]/95 to-[#e5eef8]/92" />
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{
            background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(16, 80, 171, 0.26), transparent 35%)`,
          }}
        />
      </div>

      <div className="section-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="reveal flex max-w-3xl flex-col gap-6">
          <span className="chip w-fit">Offline-first finance</span>
          <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>
          <p className="text-base leading-7 text-slate-700 sm:text-lg">{hero.subheadline}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={hero.primaryHref} target="_blank" rel="noopener noreferrer" className="btn-primary pulse-badge">
              {hero.primaryCta}
            </a>
            <Link href={hero.secondaryHref} className="btn-secondary">
              {hero.secondaryCta}
            </Link>
          </div>

          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            {hero.trustMetrics.map((item, index) => (
              <button
                key={item.value}
                type="button"
                onMouseEnter={() => setActiveMetric(index)}
                onFocus={() => setActiveMetric(index)}
                onClick={() => setActiveMetric(index)}
                className={`panel-sm interactive-card text-left transition-colors ${
                  activeMetric === index ? 'border-sky-300 bg-white text-slate-900' : 'text-slate-800'
                }`}
              >
                <p className="font-display text-xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-slate-600">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
