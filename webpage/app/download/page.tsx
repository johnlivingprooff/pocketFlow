import Link from 'next/link';
import { releaseUrl, RELEASE_FILENAME, RELEASE_STATUS, RELEASE_VERSION } from '@/lib/links';

export const metadata = {
  title: 'Download pocketFlow APK',
  description: 'Download the latest pocketFlow Android APK release.',
};

export default function DownloadPage() {
  return (
    <main className="section-shell pb-20 pt-14 sm:pt-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">PocketFlow APK</p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-teal-900 sm:text-5xl">
        Download the latest Android build
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
        Install the current APK directly on your device. No account needed.
      </p>

      <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Current release</p>
          <p className="mt-1 font-display text-2xl font-bold text-teal-900">v{RELEASE_VERSION}</p>
          <p className="mt-2 text-xs text-slate-500">
            {RELEASE_STATUS} · {RELEASE_FILENAME} · 60 MB
          </p>
        </div>
        <Link href={releaseUrl} className="btn-primary justify-center">
          Download APK
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-teal-900">Install notes</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>• Download the APK to your Android device.</li>
          <li>• Open the file and allow installation from this source if prompted.</li>
          <li>• Upgrading? Use the matching signed release to keep your data.</li>
        </ul>
      </div>
    </main>
  );
}
