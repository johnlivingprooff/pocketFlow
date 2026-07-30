'use client';

import Image from 'next/image';
import Link from 'next/link';
import { hero, philosophy } from '@/lib/content';

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-12 pt-24 sm:pb-20 sm:pt-36">
      <div className="absolute inset-0 -z-10" style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 0%, rgba(61, 100, 32, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 100%, rgba(20, 184, 166, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(201, 162, 39, 0.06) 0%, transparent 60%)
        `
      }} />

      <div className="section-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="reveal flex flex-col items-start gap-5 sm:gap-6">
          <span className="chip w-fit">Offline-first finance</span>

          <div className="space-y-4 sm:space-y-5">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {hero.subheadline}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={hero.primaryHref}
              className="btn-primary justify-center px-6 py-3.5 text-sm sm:px-7 sm:text-base"
            >
              {hero.primaryCta}
            </Link>
            <Link
              href={hero.secondaryHref}
              className="btn-secondary justify-center px-6 py-3.5 text-sm sm:px-7 sm:text-base"
            >
              {hero.secondaryCta}
            </Link>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {hero.trustMetrics.map((item) => (
              <div
                key={item.value}
                className="glass-card"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-700 sm:text-sm">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal relative">
          <div className="relative rounded-2xl bg-white/60 p-4 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md sm:rounded-[2rem] sm:p-6" style={{
            border: '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
          }}>
            <div className="relative rounded-xl bg-white/70 p-4 sm:rounded-[1.5rem] sm:p-6" style={{
              border: '1px solid rgba(148, 163, 184, 0.1)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/80 px-4 py-3" style={{
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                    PocketFlow
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-700 sm:text-sm">
                    Fast money tracking for daily life
                  </p>
                </div>
                <div className="rounded-full bg-forest-700 px-3 py-1 text-[10px] font-semibold text-white sm:text-xs">
                  APK
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-center">
                  <Image
                    src="/assets/app_icon.png"
                    alt="PocketFlow app icon"
                    width={220}
                    height={220}
                    className="h-auto w-full max-w-[190px] rounded-xl sm:max-w-[220px] sm:rounded-[1.5rem]"
                    priority
                  />
                </div>

                <div className="mt-5 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
                    Why it feels lighter
                  </p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-slate-900 sm:text-2xl">
                    {philosophy.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {philosophy.body}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}