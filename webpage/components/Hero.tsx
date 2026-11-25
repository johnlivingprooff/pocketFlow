import Link from 'next/link';
import { AppPreview } from '@/components/AppPreview';
import { hero } from '@/lib/content';

export function Hero() {
  return (
    <section className="section-shell grid items-center gap-12 pb-16 pt-14 sm:pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-20">
      <div>
        <span className="chip">{hero.eyebrow}</span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-teal-900 sm:text-6xl">
          {hero.headline}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{hero.subheadline}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={hero.primaryHref} className="btn-primary">
            {hero.primaryCta}
          </Link>
          <span className="text-sm text-slate-500">{hero.note}</span>
        </div>
      </div>
      <AppPreview />
    </section>
  );
}
