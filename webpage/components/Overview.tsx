import { philosophy } from '@/lib/content';

export function Overview() {
  return (
    <section className="section-shell py-12 lg:py-14" id="overview">
      <div className="card p-8 lg:p-10 flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-ink-900 dark:text-sand-50">{philosophy.title}</h2>
        <p className="text-base leading-7 text-ink-700 dark:text-sand-200">{philosophy.body}</p>
      </div>
    </section>
  );
}
