import { howItWorks } from '@/lib/content';

export function HowItWorks() {
  return (
    <section className="section-shell py-16 sm:py-20 lg:py-24" id="workflow">
      <div className="reveal mb-8 flex max-w-3xl flex-col gap-4">
        <span className="chip w-fit">Workflow</span>
        <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
          A straightforward loop for everyday money decisions.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {howItWorks.map((step, index) => (
          <article key={step.title} className="panel reveal flex gap-4 p-6 sm:p-7">
            <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sky-700 font-display text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
