'use client';

import Image from 'next/image';
import { useState } from 'react';

const APK_DOWNLOAD_URL =
  'https://github.com/johnlivingprooff/pocketFlow/releases/download/v2.0.1/pocketflow-v2.0.1.apk';
import { cta } from '@/lib/content';

type MessageTone = 'idle' | 'success' | 'error';

type WaitlistResponse = {
  message?: string;
  error?: string;
};

export function CTA() {
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<MessageTone>('idle');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !fullname.trim()) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setTone('idle');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          fullname: fullname.trim(),
        }),
      });

      const payload = (await response.json()) as WaitlistResponse;

      if (!response.ok) {
        setTone('error');
        setMessage(payload.error || 'Unable to submit right now. Please try again in a moment.');
        return;
      }

      setTone('success');
      setMessage(payload.message || 'Thanks, you are on the waitlist. We will share release updates soon.');
      setEmail('');
      setFullname('');
    } catch {
      setTone('error');
      setMessage('Network issue detected. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full flex flex-col items-center justify-center py-16 bg-white" id="access">
      <div className="max-w-xl w-full flex flex-col items-center gap-7 px-4">
        <span className="chip mb-2">Download</span>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center text-slate-900">Get pocketFlow for Android</h2>
        <p className="text-center text-slate-600 text-base max-w-md">
          Download the official APK or join the beta group for early access and updates.
        </p>
        <a
          href={APK_DOWNLOAD_URL}
          className="btn-primary text-lg px-8 py-3 rounded-xl shadow-md transition hover:scale-105"
          download
        >
          Download APK
        </a>
        <div className="flex flex-col gap-2 w-full mt-4">
          <form onSubmit={handleSubmit} className="panel-sm flex flex-col gap-4 p-5 sm:p-6 w-full">
            <p className="font-display text-lg font-semibold text-slate-900">{cta.waitlistTitle}</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                type="text"
                value={fullname}
                onChange={(event) => setFullname(event.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full justify-center disabled:opacity-60">
              {isSubmitting ? 'Submitting...' : cta.waitlistAction}
            </button>
            {message ? (
              <p
                className={`text-sm ${tone === 'success' ? 'text-emerald-700' : tone === 'error' ? 'text-rose-700' : 'text-slate-600'}`}
                aria-live="polite"
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
        <span className="text-xs text-slate-400 mt-2">Version 2.0.1 · Updated Mar 2026</span>
      </div>
    </section>
  );
}
