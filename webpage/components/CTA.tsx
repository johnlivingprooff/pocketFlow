'use client';

import Link from 'next/link';
import { cta } from '@/lib/content';

export function CTA() {
  return (
    <section id="access" className="section-shell pb-20 pt-4 sm:pb-24">
      <div className="reveal relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-10 text-white shadow-[0_36px_100px_rgba(15,23,42,0.2)] sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.18),transparent_30%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="chip border-white/15 bg-white/5 text-[#f0d57c]">Ready to install</span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {cta.headline}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              {cta.body}
            </p>
            <p className="mt-5 text-sm text-white/55">{cta.promise}</p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5">
            <Link href={cta.primaryHref} className="btn-primary justify-center px-6 py-3.5 text-base">
              {cta.primary}
            </Link>
            <Link href={cta.secondaryHref} className="btn-secondary justify-center border-white/15 bg-transparent px-6 py-3.5 text-base text-white hover:bg-white/8">
              {cta.secondary}
            </Link>
            <Link href="/download" className="inline-flex items-center justify-center rounded-full border border-white/12 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/8">
              Open download page
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
