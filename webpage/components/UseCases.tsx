import { useCases } from '@/lib/content';

export function UseCases() {
  return (
    <section className="section-shell py-12 lg:py-16" id="use-cases">
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-ink-900 dark:text-sand-50">Practical use cases</h2>
        <p className="text-base text-ink-700 dark:text-sand-200 max-w-3xl">
          Grounded scenarios based on the existing app flows—no speculation.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {useCases.map((item) => (
          <div key={item.title} className="card p-6 flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-sand-50">{item.title}</h3>
            <p className="text-sm text-ink-700 dark:text-sand-200">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
