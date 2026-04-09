'use client';

import { features, howItWorks, useCases } from '@/lib/content';

export function Features() {
  return (
    <section id="capabilities" className="section-shell pb-16 pt-6 sm:pb-20">
      <div className="reveal mx-auto max-w-2xl text-center">
        <span className="chip mx-auto">Built to stay out of your way</span>
        <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Everything points back to faster daily tracking.
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
          PocketFlow is strongest when it helps you capture money quickly, review what matters, and move on.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="reveal rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c9a227]">Feature</p>
            <h3 className="mt-4 font-display text-2xl font-semibold text-slate-950">{feature.title}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">{feature.body}</p>
            <p className="mt-5 text-sm font-medium text-slate-500">{feature.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="reveal rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c9a227]">How it works</p>
          <div className="mt-6 space-y-5">
            {howItWorks.map((step, index) => (
              <div key={step.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c9a227] text-sm font-semibold text-[#08181a]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/70">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reveal rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c9a227]">Best fits</p>
          <div className="mt-6 space-y-4">
            {useCases.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
                <h3 className="font-display text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
