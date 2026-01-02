import { features } from '@/lib/content';

export function Features() {
  return (
    <section className="section-shell py-12 lg:py-16" id="features">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-ink-900 dark:text-sand-50">Structured capabilities</h2>
        <p className="text-base text-ink-700 dark:text-sand-200 max-w-3xl">
          Built for clarity: wallets stay distinct, transfers stay out of spend charts, and receipts live on-device.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <div key={feature.title} className="card p-6 flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-sand-50">{feature.title}</h3>
            <p className="text-sm text-ink-700 dark:text-sand-200">{feature.body}</p>
            <p className="text-sm text-ink-600 dark:text-sand-300">{feature.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
