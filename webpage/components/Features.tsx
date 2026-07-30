'use client';

import { features, howItWorks, useCases } from '@/lib/content';

export function Features() {
  return (
    <section id="capabilities" className="section-shell pb-16 pt-6 sm:pb-20">
      <div className="reveal mx-auto max-w-2xl text-center">
        <span className="chip mx-auto">Built to stay out of your way</span>
        <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Everything points back to faster daily tracking.
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
          PocketFlow is strongest when it helps you capture money quickly, review what matters, and move on.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="glass-card glass-card-hover"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-700">
              Feature
            </p>
            <h3 className="mt-4 font-display text-2xl font-semibold text-slate-900">
              {feature.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">{feature.body}</p>
            <p className="mt-5 text-sm font-medium text-slate-500">{feature.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-700">
            How it works
          </p>
          <div className="mt-6 space-y-5">
            {howItWorks.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl bg-white/60 p-4 transition-all duration-200 hover:bg-white/80"
                style={{ border: '1px solid rgba(148, 163, 184, 0.1)' }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-700 text-sm font-semibold text-white shadow-[0_4px_16px_-2px_rgba(61,100,32,0.3)]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-700">
            Best fits
          </p>
          <div className="mt-6 space-y-4">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl bg-white/50 p-5 transition-all duration-200 hover:bg-white/70"
                style={{ border: '1px solid rgba(148, 163, 184, 0.1)' }}
              >
                <h3 className="font-display text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}