'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { acceptInvite } from '../../../lib/api';
import Link from 'next/link';

export default function InvitePage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const accept = async () => {
    setStatus('loading');
    try {
      await acceptInvite(token);
      setStatus('done');
      setTimeout(() => router.push('/'), 1200);
    } catch (e: any) {
      setStatus('error');
      setMsg(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-[560px] pt-8">
      <div className="glass-strong rounded-[24px] p-7">
        <div className="text-xs font-bold uppercase tracking-widest text-teal-700">Invitation</div>
        <h1 className="mt-2 text-xl font-black tracking-tight text-ink-900">Join shared wallet</h1>
        <p className="mt-2 text-sm leading-6 text-ink-700">You were invited via link. Accept to become a member. Requires account.</p>
        <div className="mt-4 break-all rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-ink-600">Token: {token}</div>
        <button onClick={accept} disabled={status === 'loading' || status === 'done'} className="mt-6 inline-flex w-full justify-center rounded-full bg-ink-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          {status === 'loading' ? 'Accepting…' : status === 'done' ? 'Accepted ✓' : 'Accept invitation'}
        </button>
        {status === 'error' && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{msg}</div>}
        {status === 'done' && <div className="mt-3 text-sm font-bold text-emerald-700">Success — redirecting to dashboard…</div>}
        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm font-bold text-teal-700 hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
