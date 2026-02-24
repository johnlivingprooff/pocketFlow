import { securityChecklist, trustPillars } from '@/lib/content';

export function Trust() {
  return (
    <section className="section-shell py-16 sm:py-20" id="trust">
      <div className="reveal flex max-w-3xl flex-col gap-4">
        <span className="chip w-fit">Trust model</span>
        <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
          Built for people who need confidence in every financial record.
        </h2>
        <p className="text-base leading-7 text-slate-700">
          Every important product decision in pocketFlow is biased toward privacy, data ownership, and
          transparent behavior.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trustPillars.map((item) => (
          <article key={item.title} className="panel reveal p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel reveal reveal-delay-1 p-6 sm:p-7">
          <h3 className="font-display text-xl font-semibold text-slate-900">Operational safeguards</h3>
          <ul className="mt-4 grid gap-3">
            {securityChecklist.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-sky-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel reveal reveal-delay-2 flex flex-col justify-between gap-5 p-6 sm:p-7">
          <div>
            <p className="font-display text-xl font-semibold text-slate-900">Visible release history</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              PocketFlow ships publicly. You can inspect release notes and track improvements over time.
            </p>
          </div>
          <a
            href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-center"
          >
            Open latest release
          </a>
        </div>
      </div>
    </section>
  );
}
