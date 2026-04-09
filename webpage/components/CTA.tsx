'use client';

import Link from 'next/link';
import { cta } from '@/lib/content';
import { RELEASE_FILENAME, RELEASE_SIZE, RELEASE_STATUS, RELEASE_VERSION } from '@/lib/links';

export function CTA() {
  return (
    <section id="access" className="section-shell pb-16 pt-3 sm:pb-24 sm:pt-4">
      <div className="reveal relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-5 py-8 text-white shadow-[0_36px_100px_rgba(15,23,42,0.2)] sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.18),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <span className="chip border-white/15 bg-white/5 text-[#f0d57c]">Ready to install</span>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white sm:mt-5 sm:text-4xl">
              {cta.headline}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70 sm:mt-4 sm:text-lg sm:leading-8">
              {cta.body}
            </p>
            <p className="mt-4 text-xs leading-6 text-white/55 sm:mt-5 sm:text-sm">{cta.promise}</p>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="rounded-[1.25rem] border border-white/10 bg-[#08181a] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Release</p>
                  <p className="mt-2 text-xl font-semibold text-white">v{RELEASE_VERSION}</p>
                </div>
                <span className="rounded-full bg-[#c9a227] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#08181a]">
                  {RELEASE_STATUS}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Artifact</p>
                  <p className="mt-1 text-white/88">{RELEASE_FILENAME}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Type</p>
                  <p className="mt-1 text-white/88">{RELEASE_SIZE}</p>
                </div>
              </div>
            </div>

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
