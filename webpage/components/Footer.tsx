import { betaWhatsappUrl } from '@/lib/links';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80">
      <div className="section-shell py-8">
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>Offline-first. Built for clear money decisions.</p>
            <p>
              Built by{' '}
              <a
                href="https://eiteone.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline underline-offset-2 transition-colors hover:text-slate-900"
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
              className="transition-colors hover:text-slate-900"
            >
              Beta WhatsApp
            </a>
            <a
              href="https://github.com/johnlivingprooff/pocketFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-900"
            >
              GitHub
            </a>
            <a
              href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-slate-900"
            >
              Releases
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
