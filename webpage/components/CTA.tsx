'use client';

import Image from 'next/image';
import { useState } from 'react';
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
    <section className="section-shell pb-16 pt-8 sm:pb-20 sm:pt-12" id="access">
      <div className="panel reveal relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/assets/la-ferrari.jpg"
            alt="la ferrari performance background"
            fill
            className="object-cover opacity-18"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/94 to-white/92" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:gap-10">
          <div>
            <span className="chip">Access</span>
            <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{cta.headline}</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-700">{cta.body}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={cta.primaryHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {cta.primary}
              </a>
              <a href={cta.secondaryHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                {cta.secondary}
              </a>
            </div>
            <p className="mt-3 text-sm text-slate-500">{cta.promise}</p>
          </div>

          <form onSubmit={handleSubmit} className="panel-sm flex flex-col gap-4 p-5 sm:p-6">
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
      </div>
    </section>
  );
}
