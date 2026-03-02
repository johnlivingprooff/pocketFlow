import React from 'react';

export const metadata = {
  title: 'Download pocketFlow APK',
  description: 'Download the latest pocketFlow Android APK directly.',
};

export default function DownloadPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full flex flex-col items-center gap-6 py-16">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-center text-slate-900">Download pocketFlow</h1>
        <p className="text-center text-slate-600 text-base max-w-md">
          Get the latest version of pocketFlow for Android. This is the official offline-first APK release. No signup required.
        </p>
        <a
          href="https://github.com/johnlivingprooff/pocketFlow/releases/download/v2.0.1/pocketflow-v2.0.1.apk"
          className="btn-primary text-lg px-8 py-3 rounded-xl shadow-md transition hover:scale-105"
          download
        >
          Download APK
        </a>
        <span className="text-xs text-slate-400 mt-2">Version 2.0.1 · Updated Mar 2026</span>
      </div>
    </main>
  );
}
