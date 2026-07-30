import { betaWhatsappUrl } from '@/lib/links';

export function Footer() {
  return (
    <footer className="border-t backdrop-blur-sm" style={{
      borderColor: 'rgba(148, 163, 184, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.3)'
    }}>
      <div className="section-shell py-8">
        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>Offline-first. Built for clear money decisions.</p>
            <p>
              Built by{' '}
              <a
                href="https://eiteone.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline underline-offset-2 transition-colors hover:text-forest-700"
              >
                eiteone
              </a>
              {' '}(eiteone.org)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={betaWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-forest-700"
            >
              Beta WhatsApp
            </a>
            <a
              href="https://github.com/johnlivingprooff/pocketFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-forest-700"
            >
              GitHub
            </a>
            <a
              href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-forest-700"
            >
              Releases
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}