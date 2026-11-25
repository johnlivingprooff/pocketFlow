import { proof } from '@/lib/content';

export function Features() {
  return (
    <section id="why" className="section-shell border-t border-slate-200 py-16 sm:py-20">
      <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-teal-900 sm:text-3xl">
        Built to be quick, then get out of the way.
      </h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {proof.map((item, index) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold text-teal-700">0{index + 1}</p>
            <h3 className="mt-3 font-display text-lg font-bold text-teal-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500">Open → Record → Review. That is the whole workflow.</p>
    </section>
  );
}
