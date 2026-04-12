'use client';

import Image from 'next/image';
import Link from 'next/link';
import { hero, philosophy } from '@/lib/content';

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-12 pt-24 sm:pb-20 sm:pt-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.16),transparent_34%),linear-gradient(180deg,#f7f8fb_0%,#eef3f7_48%,#ffffff_100%)]" />
      <div className="absolute left-1/2 top-24 -z-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#0b2326]/8 blur-3xl sm:h-[28rem] sm:w-[28rem]" />

      <div className="section-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="reveal flex flex-col items-start gap-5 sm:gap-6">
          <span className="chip w-fit">Offline-first finance</span>

          <div className="space-y-4 sm:space-y-5">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {hero.subheadline}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href={hero.primaryHref} className="btn-primary justify-center px-6 py-3.5 text-sm shadow-lg shadow-[#0b2326]/10 sm:px-7 sm:text-base">
              {hero.primaryCta}
            </Link>
            <Link href={hero.secondaryHref} className="btn-secondary justify-center px-6 py-3.5 text-sm sm:px-7 sm:text-base">
              {hero.secondaryCta}
            </Link>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            {hero.trustMetrics.map((item) => (
              <div key={item.value} className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-soft backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c9a227] sm:text-sm">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal relative">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[#0b2326] p-4 shadow-[0_30px_90px_rgba(11,35,38,0.18)] sm:rounded-[2rem] sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.18),transparent_28%)]" />
            <div className="relative rounded-[1.4rem] border border-white/10 bg-[#08181a] p-3 sm:rounded-[1.6rem] sm:p-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-xs">PocketFlow</p>
                  <p className="mt-1 text-xs font-medium text-white/80 sm:text-sm">Fast money tracking for daily life</p>
                </div>
                <div className="rounded-full bg-[#c9a227] px-3 py-1 text-[10px] font-semibold text-[#08181a] sm:text-xs">APK</div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-[#0d2224] p-3 sm:mt-5 sm:rounded-[1.5rem] sm:p-4">
                <div className="flex items-center justify-center rounded-[1.1rem] bg-[#0a1b1d] p-4 sm:rounded-[1.25rem] sm:p-5">
                  <Image
                    src="/assets/app_icon.png"
                    alt="PocketFlow app icon"
                    width={220}
                    height={220}
                    className="h-auto w-full max-w-[190px] rounded-[1.75rem] shadow-2xl shadow-black/30 sm:max-w-[220px] sm:rounded-[2rem]"
                    priority
                  />
                </div>

                <div className="mt-4 rounded-[1.1rem] border border-white/8 bg-white/5 p-4 sm:mt-5 sm:rounded-[1.25rem]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">Why it feels lighter</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">{philosophy.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/15">{philosophy.body}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
