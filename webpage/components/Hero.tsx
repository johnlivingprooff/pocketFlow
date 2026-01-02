import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative section-shell pt-32 pb-28 lg:pt-40 lg:pb-36 overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center text-center gap-10">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-sand-50 max-w-4xl">
          See your cash flow clearly.
        </h1>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 justify-center rounded-xl bg-gold-600 px-8 py-4 text-sand-50 text-lg font-semibold shadow-2xl hover:bg-gold-500 hover:scale-105 transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12L3 7L4.5 5.5L7 8V0H9V8L11.5 5.5L13 7L8 12ZM0 14V16H16V14H0Z" fill="currentColor"/>
            </svg>
            Download App
          </Link>
          <Link
            href="#screens"
            className="inline-flex items-center justify-center rounded-xl border-2 border-sand-300/30 px-8 py-4 text-sand-100 text-lg font-semibold hover:bg-sand-50/5 hover:border-sand-300/50 transition-all duration-200"
          >
            See Features
          </Link>
        </div>
      </div>
    </section>
  );
}
