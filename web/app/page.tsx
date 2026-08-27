'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listSharedWallets, createSharedWallet, listTx, syncTx, SharedWalletSummary } from '../lib/api';
import { PlusIcon, WalletIcon, UsersIcon, LinkIcon, SparklesIcon, TrashIcon, ArrowUpRightIcon } from '../components/icons';

function formatMoney(n: number, ccy = 'MWK') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
}

export default function Dashboard() {
  const router = useRouter();
  const [wallets, setWallets] = useState<SharedWalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [ authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('pf_access');
    setAuthed(!!token);
    if (!token) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const w = await listSharedWallets();
        setWallets(w);
      } catch (e: any) {
        if (e.status === 401) router.replace('/login');
        else setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const w = await createSharedWallet(newName.trim());
      setWallets((prev) => [w, ...prev]);
      setNewName('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (authed === false) return null;

  return (
    <div className="space-y-6">
      {/* Hero glass */}
      <div className="glass-strong rounded-[24px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-3 py-1 text-xs font-bold tracking-widest text-white">
              <SparklesIcon className="h-3.5 w-3.5" /> LIQUID GLASS • SHARED ONLY
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-ink-900 sm:text-[28px]">Your shared wallets</h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-ink-700">
              Finance dashboard for collaboration. Create a shared wallet, invite members via link, and track income & expense together. Personal wallets stay on the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm sm:block">
              {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
            </div>
            <a
              href="https://pf.eiteone.org/download"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-sm font-bold text-white shadow"
            >
              Get app <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Stats glass row */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Total shared wallets</div>
            <div className="mt-2 text-2xl font-black text-ink-900">{loading ? '—' : wallets.length}</div>
            <div className="mt-1 text-xs text-ink-600">Synced via cloud • Invite-only</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Collaboration</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink-900">{wallets.reduce((a, w) => a + w.memberCount, 0) || 0}</span>
              <span className="text-sm font-semibold text-ink-600">members total</span>
            </div>
            <div className="mt-1 text-xs text-ink-600">Owner / member roles</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Scope</div>
            <div className="mt-2 text-sm font-bold leading-5 text-ink-900">Web = shared wallets only</div>
            <div className="mt-1 text-xs leading-5 text-ink-600">Budgets, goals, SMS and receipts are app-only.</div>
          </div>
        </div>
      </div>

      {/* Create */}
      <div id="new-wallet" className="glass rounded-[20px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-widest text-ink-600">New shared wallet</label>
            <div className="mt-2 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Household, Trip 2026, Savings group"
                className="w-full rounded-full border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-600/60 focus:border-teal-600 focus:outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" /> {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-600">Requires account. You become owner and can invite members via link.</p>
          </div>
        </div>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      </div>

      {/* Wallets grid */}
      <div id="wallets">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-ink-800">Shared wallets</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-700 shadow-sm">{wallets.length} total</span>
        </div>

        {loading ? (
          <div className="glass rounded-[20px] p-8 text-center text-sm font-medium text-ink-600">Loading shared wallets…</div>
        ) : wallets.length === 0 ? (
          <div className="glass rounded-[20px] p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-700 shadow-sm">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-black text-ink-900">No shared wallets yet</div>
            <div className="mt-1 text-sm leading-6 text-ink-600">Create one above. Invite-only, synced for all members.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {wallets.map((w) => (
              <Link key={w.id} href={`/wallets/${w.id}`} className="group glass rounded-[20px] p-5 transition hover:shadow-glass-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white shadow">
                    <WalletIcon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-widest ${w.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-white text-ink-700'}`}>
                    {w.role.toUpperCase()} • {w.memberCount} members
                  </span>
                </div>
                <div className="mt-4 text-[15px] font-black tracking-tight text-ink-900">{w.name}</div>
                <div className="mt-1 text-xs font-medium text-ink-600">{w.syncStatus} • {w.shareId ? `Share ID ${w.shareId.slice(0, 6)}…` : 'No share ID'}</div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
                  Open wallet <ArrowUpRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
