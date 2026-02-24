'use client';

import Image from 'next/image';
import { useState } from 'react';
import { features } from '@/lib/content';

export function Features() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="section-shell py-14 sm:py-16 lg:py-20" id="capabilities">
      <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/assets/engine.jpg"
            alt="engine precision background"
            fill
            className="object-cover opacity-32"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8fbff]/95 via-[#f2f6fc]/94 to-[#e8f0f8]/90" />
        </div>

        <div className="reveal mb-6 flex max-w-3xl flex-col gap-2">
          <span className="chip w-fit">Core features</span>
          <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
            Simple tools for daily money tracking.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <button
              key={feature.title}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              className={`interactive-card reveal rounded-2xl border p-6 text-left backdrop-blur ${
                activeIndex === index
                  ? 'border-sky-300 bg-white/94 shadow-card'
                  : 'border-slate-200/80 bg-white/86 shadow-soft'
              }`}
            >
              <h3 className="font-display text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{feature.body}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-700 backdrop-blur sm:px-5">
          <span className="font-semibold text-slate-900">{features[activeIndex].title}:</span>{' '}
          {features[activeIndex].detail}
        </div>
      </div>
    </section>
  );
}
