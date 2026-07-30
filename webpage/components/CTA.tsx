'use client';

import Link from 'next/link';
import { cta } from '@/lib/content';
import { RELEASE_FILENAME, RELEASE_SIZE, RELEASE_STATUS, RELEASE_VERSION } from '@/lib/links';

export function CTA() {
  return (
    <section id="access" className="section-shell pb-16 pt-3 sm:pb-24 sm:pt-4">
      <div className="reveal relative overflow-hidden rounded-2xl bg-white/70 px-5 py-8 shadow-glass-lg backdrop-blur-md sm:px-10 sm:py-12" style={{
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 12px 48px -8px rgba(15, 23, 42, 0.08), 0 4px 16px -4px rgba(15, 23, 42, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
      }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,100,32,0.06),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <span className="chip">
              Ready to install
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:mt-5 sm:text-4xl">
              {cta.headline}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:mt-4 sm:text-lg sm:leading-8">
              {cta.body}
            </p>
            <p className="mt-4 text-xs leading-6 text-slate-500 sm:mt-5 sm:text-sm">
              {cta.promise}
            </p>
          </div>

          <div className="grid gap-4 rounded-2xl bg-white/60 p-4 sm:p-5" style={{
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <div className="rounded-2xl bg-white/80 p-4" style={{
              border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-sm">
                    Release
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                    v{RELEASE_VERSION}
                  </p>
                </div>
                <span className="rounded-full bg-forest-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_16px_-2px_rgba(61,100,32,0.3)]">
                  {RELEASE_STATUS}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/80 px-3 py-3" style={{
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Artifact
                  </p>
                  <p className="mt-1 text-slate-700">{RELEASE_FILENAME}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-3" style={{
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Type
                  </p>
                  <p className="mt-1 text-slate-700">{RELEASE_SIZE}</p>
                </div>
              </div>
            </div>

            <Link
              href={cta.primaryHref}
              className="btn-primary justify-center px-6 py-3.5 text-base"
            >
              {cta.primary}
            </Link>
            <Link
              href={cta.secondaryHref}
              className="btn-secondary justify-center px-6 py-3.5 text-base text-slate-700 hover:bg-white/90"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
            >
              {cta.secondary}
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-forest-400 hover:text-forest-700 hover:bg-white/70"
              style={{
                borderColor: 'rgba(148, 163, 184, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.5)'
              }}
            >
              Open download page
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}