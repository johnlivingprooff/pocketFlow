'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, register } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || password.length < 8) {
      setError('Use a valid email and at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password);
      router.push('/');
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[560px] pt-6">
      <div className="glass-strong rounded-[28px] p-7 sm:p-8">
        <div className="inline-flex rounded-full bg-ink-900 px-3 py-1 text-xs font-bold tracking-widest text-white">ACCOUNT REQUIRED • WEB</div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-ink-900">Sign in to shared wallets</h1>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          On the web, every shared wallet is tied to your cloud account. Create an account or sign in to continue. Personal wallets stay on the app.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setMode('login')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${mode === 'login' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('register')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${mode === 'register' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700'}`}
          >
            Create account
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-600">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-600/60 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-ink-600">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Min 8 characters"
              className="mt-2 w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-600/60 focus:border-teal-600 focus:outline-none"
            />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
          <button
            onClick={submit}
            disabled={loading}
            className="mt-2 inline-flex w-full justify-center rounded-full bg-ink-900 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <p className="text-center text-xs leading-5 text-ink-600">
            Web = shared wallets only. <Link href="https://pf.eiteone.org/download" className="font-bold text-teal-700 underline">Need a personal wallet? Get the app.</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
