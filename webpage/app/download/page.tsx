import React from 'react';
import Link from 'next/link';
import { releaseUrl, RELEASE_VERSION } from '@/lib/links';

export const metadata = {
  title: 'Download pocketFlow APK',
  description: 'Download the latest pocketFlow Android APK release.',
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#08181a] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#c9a227]">PocketFlow APK</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Download the latest Android build</h1>
        <p className="mt-5 text-lg leading-8 text-white/72">
          This page gives you the current direct APK release for pocketFlow. If Android blocks installation,
          enable installs from your browser or file manager first.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/50">Current release</p>
              <p className="mt-2 text-2xl font-semibold">v{RELEASE_VERSION}</p>
              <p className="mt-2 text-sm text-white/60">File: app-release.apk</p>
            </div>
            <Link
              href={releaseUrl}
              className="inline-flex items-center justify-center rounded-full bg-[#c9a227] px-6 py-3 text-sm font-semibold text-[#08181a] transition hover:bg-[#d7b33a]"
            >
              Download APK
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-7 text-white/68">
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
