export function Footer() {
  return (
    <footer className="bg-ink-900 border-t border-ink-700">
      <div className="section-shell py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-sm text-sand-400">
            Available for Android · Offline-first · Open source
          </p>
          <p className="text-sm text-sand-400">
            Built by{' '}
            <a
              href="https://eiteone.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline underline-offset-2 transition-colors"
            >
              eiteone
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
