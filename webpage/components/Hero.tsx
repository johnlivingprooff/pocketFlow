import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen pt-24 sm:pt-32 overflow-hidden section-shell pb-20 sm:pb-28 lg:pt-40 lg:pb-36 rounded-tr-2xl sm:rounded-tr-3xl rounded-br-2xl sm:rounded-br-3xl flex items-center">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/assets/engine.jpg')] bg-cover bg-[center_right_10%] sm:bg-[center_right_10%]" />
      {/* Dark-to-transparent gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/90 sm:via-ink-900/80 to-transparent" />
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-32 sm:h-48 pointer-events-none bg-gradient-to-b from-ink-900 to-transparent" />
      {/* Bottom fade into next section */}
      <div className="absolute inset-x-0 bottom-0 h-40 sm:h-56 pointer-events-none bg-gradient-to-b from-transparent to-ink-900" />
      {/* Right fade */}
      <div className="absolute inset-y-0 right-0 w-32 sm:w-48 pointer-events-none bg-gradient-to-l from-ink-900 to-transparent" />

      <div className="relative z-10 flex flex-col items-start w-full max-w-4xl gap-6 sm:gap-10 text-left px-4 sm:px-0">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl lg:text-7xl text-sand-50">
          See your cash flow clearly.
        </h1>

        <div className="flex items-center justify-start">
          <Link
            href="#features"
            className="text-base sm:text-lg font-semibold underline transition-colors text-sand-100 decoration-sand-300/60 underline-offset-4 hover:text-sand-50"
          >
            See features
          </Link>
        </div>
      </div>
    </section>
  );
}
