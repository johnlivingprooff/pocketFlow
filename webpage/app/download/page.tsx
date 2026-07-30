import React from 'react';
import Link from 'next/link';
import { releaseUrl, RELEASE_FILENAME, RELEASE_STATUS, RELEASE_VERSION } from '@/lib/links';

export const metadata = {
  title: 'Download pocketFlow APK',
  description: 'Download the latest pocketFlow Android APK release.',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-14 text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-forest-700 sm:text-sm">
          PocketFlow APK
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Download the latest Android build
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
          This page gives you the current direct APK release for pocketFlow. If Android blocks installation,
          enable installs from your browser or file manager first.
        </p>

        <div className="mt-8 rounded-3xl bg-white/70 p-5 shadow-glass-lg backdrop-blur-md sm:mt-10 sm:p-6" style={{
          border: '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow: '0 12px 48px -8px rgba(15, 23, 42, 0.08), 0 4px 16px -4px rgba(15, 23, 42, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)'
        }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 sm:text-sm">
                Current release
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                v{RELEASE_VERSION}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="rounded-full bg-forest-700 px-3 py-1 font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_16px_-2px_rgba(61,100,32,0.3)]">
                  {RELEASE_STATUS}
                </span>
                <span className="rounded-full border px-3 py-1 text-slate-600" style={{
                  borderColor: 'rgba(148, 163, 184, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)'
                }}>
                  {RELEASE_FILENAME}
                </span>
              </div>
            </div>
            <Link
              href={releaseUrl}
              className="btn-primary justify-center px-6 py-3 text-sm"
            >
              Download APK
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white/70 p-5 text-sm leading-7 text-slate-600 sm:mt-10 sm:p-6" style={{
          border: '1px solid rgba(148, 163, 184, 0.15)'
        }}>
          <h2 className="text-lg font-semibold text-slate-900">Install notes</h2>
          <ul className="mt-4 space-y-2">
            <li>&bull; Download the APK to your Android device.</li>
            <li>&bull; Open the file and allow installation from this source if prompted.</li>
            <li>&bull; If you already have pocketFlow installed, you may need the matching signed release to upgrade cleanly.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}