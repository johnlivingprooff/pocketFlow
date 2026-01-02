import Link from 'next/link';

export function CTA() {
  return (
    <section className="section-shell py-24 lg:py-32 bg-gradient-to-b from-ink-800 to-ink-900">
      <div className="flex flex-col items-center gap-8 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-sand-50">
          Take control of your finances
        </h2>
        <p className="text-xl text-sand-200">
          Download pocketFlow and start tracking your cash flow today. Offline-first, privacy-focused, built for clarity.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Link
            href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 justify-center rounded-xl bg-gold-600 px-10 py-5 text-sand-50 text-lg font-bold shadow-2xl hover:bg-gold-500 hover:scale-105 transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12L3 7L4.5 5.5L7 8V0H9V8L11.5 5.5L13 7L8 12ZM0 14V16H16V14H0Z" fill="currentColor"/>
            </svg>
            Download Latest Release
          </Link>
          <Link
            href="https://github.com/johnlivingprooff/pocketFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border-2 border-sand-300/30 px-10 py-5 text-sand-100 text-lg font-semibold hover:bg-sand-50/5 hover:border-sand-300/50 transition-all duration-200"
          >
            View on GitHub
          </Link>
        </div>
        <p className="text-sm text-sand-400 mt-8">
          Available for Android · Offline-first · Open source
        </p>
      </div>
    </section>
  );
}
