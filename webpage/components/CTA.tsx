import Link from 'next/link';
import { cta } from '@/lib/content';

export function CTA() {
  return (
    <section id="download" className="section-shell pb-20 pt-2 sm:pb-24">
      <div className="rounded-3xl bg-teal-900 px-6 py-12 text-center sm:px-10">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {cta.headline}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-teal-100">{cta.body}</p>
        <Link
          href={cta.primaryHref}
          className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold text-teal-900 transition-colors hover:bg-teal-50"
        >
          {cta.primary}
        </Link>
        <p className="mt-5 text-xs text-teal-100/80">{cta.note}</p>
        <a
          href={cta.betaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-teal-100 underline underline-offset-4 hover:text-white"
        >
          {cta.betaLabel}
        </a>
      </div>
    </section>
  );
}
