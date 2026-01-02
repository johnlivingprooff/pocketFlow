import { howItWorks } from '@/lib/content';

export function HowItWorks() {
  return (
    <section className="section-shell py-20 lg:py-28 bg-gradient-to-b from-ink-900 to-ink-800" id="how-it-works">
      <div className="flex flex-col items-center gap-6 mb-16 text-center">
        <h2 className="text-3xl font-bold text-sand-50">Simple workflow</h2>
        <p className="text-lg text-sand-300 max-w-2xl">
          Four clear steps to understand and control your cash flow.
        </p>
      </div>
      <div className="max-w-4xl mx-auto">
        {howItWorks.map((step, i) => (
          <div key={i} className="relative flex gap-8 mb-12 last:mb-0">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gold-600 text-sand-50 text-xl font-bold shadow-2xl shadow-gold-600/30">
                {i + 1}
              </div>
              {i < howItWorks.length - 1 && (
                <div className="w-0.5 h-full bg-gradient-to-b from-gold-600 to-ink-700 mt-4" />
              )}
            </div>
            <div className="flex-1 pb-12">
              <h3 className="text-2xl font-bold text-sand-50 mb-3">{step.title}</h3>
              <p className="text-sand-200 leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
