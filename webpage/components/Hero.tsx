'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { hero } from '@/lib/content';

const APK_DOWNLOAD_URL =
  'https://github.com/johnlivingprooff/pocketFlow/releases/download/v2.0.1/pocketflow-v2.0.1.apk';

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
    <section className="w-full flex flex-col items-center justify-center pt-24 sm:pt-32 pb-12">
      <div className="max-w-2xl w-full flex flex-col items-center gap-7 px-4">
        <span className="chip w-fit mb-2">Offline-first finance</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-center text-slate-900">
          {hero.headline}
        </h1>
        <p className="text-center text-slate-600 text-lg max-w-xl">{hero.subheadline}</p>
        <a
          href={APK_DOWNLOAD_URL}
          className="btn-primary text-lg px-8 py-3 rounded-xl shadow-md transition hover:scale-105"
          download
        >
          Download APK
        </a>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          {hero.trustMetrics.map((item, index) => (
            <span
              key={item.value}
              className={`inline-block rounded-full border px-4 py-1 text-sm font-medium transition-colors ${
                activeMetric === index ? 'border-sky-400 bg-sky-50 text-sky-900' : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
              onMouseEnter={() => setActiveMetric(index)}
              onFocus={() => setActiveMetric(index)}
              tabIndex={0}
            >
              {item.value} <span className="ml-1 text-xs text-slate-500">{item.label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
