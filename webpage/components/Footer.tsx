export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="section-shell flex flex-col gap-3 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Offline-first money tracking. Built by eiteone.</p>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/johnlivingprooff/pocketFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-700"
          >
            GitHub
          </a>
          <a
            href="https://github.com/johnlivingprooff/pocketFlow/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-700"
          >
            Releases
          </a>
        </div>
      </div>
    </footer>
  );
}
