import React from 'react';
import Link from 'next/link';
import { releaseUrl, RELEASE_FILENAME, RELEASE_STATUS, RELEASE_VERSION } from '@/lib/links';

export const metadata = {
  title: 'Download pocketFlow APK',
  description: 'Download the latest pocketFlow Android APK release.',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#08181a] px-5 py-14 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a227] sm:text-sm">PocketFlow APK</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Download the latest Android build</h1>
        <p className="mt-4 text-base leading-7 text-white/72 sm:mt-5 sm:text-lg sm:leading-8">
          This page gives you the current direct APK release for pocketFlow. If Android blocks installation,
          enable installs from your browser or file manager first.
        </p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 sm:mt-10 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 sm:text-sm">Current release</p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">v{RELEASE_VERSION}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="rounded-full bg-[#c9a227] px-3 py-1 font-semibold uppercase tracking-[0.16em] text-[#08181a]">{RELEASE_STATUS}</span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-white/70">{RELEASE_FILENAME}</span>
              </div>
            </div>
            <Link
              href={releaseUrl}
              className="inline-flex items-center justify-center rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-[#08181a] transition hover:bg-[#d7b33a]"
            >
              Download APK
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/68 sm:mt-10 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Install notes</h2>
          <ul className="mt-4 space-y-2">
            <li>• Download the APK to your Android device.</li>
            <li>• Open the file and allow installation from this source if prompted.</li>
            <li>• If you already have pocketFlow installed, you may need the matching signed release to upgrade cleanly.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
