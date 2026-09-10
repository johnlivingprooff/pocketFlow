'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getWallet, listTx, syncTx, deleteTx, listMembers, createInvite, listSharedWallets } from '../../../lib/api';
import { WalletIcon, UsersIcon, LinkIcon, TrashIcon, PlusIcon } from '../../../components/icons';

function uid() {
  return `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function WalletDetail() {
  const params = useParams() as { id: string };
  const id = params.id;
  const [wallet, setWallet] = useState<any>(null);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);

  // form — now supports income / expense / transfer + date
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 16));
  const [toWalletId, setToWalletId] = useState<string>('');

  const load = async () => {
    try {
      const [w, t, m, all] = await Promise.all([getWallet(id), listTx(id, 50, 0), listMembers(id), listSharedWallets().catch(() => [])]);
      setWallet(w);
      setTx(t.transactions);
      setMembers(m.members);
      setAllWallets(all as any[]);
      if (!toWalletId && (all as any[]).length > 1) {
        const other = (all as any[]).find((x: any) => x.id !== id);
        if (other) setToWalletId(other.id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toIsoDate = () => {
    try {
      // dateStr is "YYYY-MM-DDTHH:mm" local → convert to ISO
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const handleAdd = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    const isoDate = toIsoDate();
    const nowIso = new Date().toISOString();

    if (type === 'transfer') {
      if (!toWalletId) {
        setError('Select a destination wallet for transfer');
        return;
      }
      if (toWalletId === id) {
        setError('Choose a different wallet to transfer to');
        return;
      }
      const dest = allWallets.find((w: any) => w.id === toWalletId);
      const destName = dest?.name ?? 'wallet';
      const srcName = wallet?.name ?? 'wallet';
      // Create paired transfer: expense from source, income to destination
      const srcPayload = {
        externalId: uid(),
        type: 'expense' as const,
        amount: Math.abs(n),
        category: 'Transfer',
        date: isoDate,
        notes: notes ? `Transfer to ${destName}: ${notes}` : `Transfer to ${destName}`,
        updatedAt: nowIso,
      };
      const dstPayload = {
        externalId: uid(),
        type: 'income' as const,
        amount: Math.abs(n),
        category: 'Transfer',
        date: isoDate,
        notes: notes ? `Transfer from ${srcName}: ${notes}` : `Transfer from ${srcName}`,
        updatedAt: nowIso,
      };
      await syncTx(id, [srcPayload]);
      await syncTx(toWalletId, [dstPayload]);
    } else {
      const externalId = uid();
      const payload = {
        externalId,
        type,
        amount: Math.abs(n),
        category: category || null,
        date: isoDate,
        notes: notes || null,
        updatedAt: nowIso,
      };
      await syncTx(id, [payload]);
    }
    setAmount('');
    setCategory('');
    setNotes('');
    await load();
  };

  const handleDelete = async (externalId: string) => {
    await deleteTx(id, externalId);
    await load();
  };

  const handleInvite = async () => {
    const r = await createInvite(id);
    setInvite(r.inviteLink);
    await navigator.clipboard.writeText(r.inviteLink);
  };

  if (loading) return <div className="glass rounded-[20px] p-8 text-center text-sm font-medium text-ink-700">Loading wallet…</div>;
  if (error) return <div className="glass rounded-[20px] p-6 text-sm font-bold text-red-700">{error}</div>;
  if (!wallet) return null;

  const income = tx.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);

  const otherWallets = allWallets.filter((w: any) => w.id !== id);

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex text-sm font-bold text-teal-700 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="glass-strong rounded-[24px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-700 text-white shadow">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-ink-900">{wallet.name}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-600">
                {wallet.role} • {wallet.memberCount} members • {wallet.syncStatus}
              </div>
            </div>
          </div>
          <button onClick={handleInvite} className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-bold text-white">
            <LinkIcon className="h-4 w-4" /> {invite ? 'Link copied!' : 'Invite link'}
          </button>
        </div>
        {invite && <div className="mt-4 break-all rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-ink-700">{invite}</div>}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Income</div>
            <div className="mt-1 text-xl font-black text-emerald-600">{income.toLocaleString()}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Expense</div>
            <div className="mt-1 text-xl font-black text-red-600">{expense.toLocaleString()}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Net</div>
            <div className={`mt-1 text-xl font-black ${income - expense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(income - expense).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[20px] p-5">
          <div className="text-sm font-black tracking-tight text-ink-900">Add transaction</div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setType('expense')} className={`rounded-full px-4 py-2 text-sm font-bold ${type === 'expense' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700'}`}>
              Expense
            </button>
            <button onClick={() => setType('income')} className={`rounded-full px-4 py-2 text-sm font-bold ${type === 'income' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700'}`}>
              Income
            </button>
            <button onClick={() => setType('transfer')} className={`rounded-full px-4 py-2 text-sm font-bold ${type === 'transfer' ? 'bg-ink-900 text-white' : 'bg-white text-ink-700'}`}>
              Transfer
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              type="number"
              className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium focus:border-teal-600 focus:outline-none"
            />
            {type !== 'transfer' ? (
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g. Food)"
                className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium focus:border-teal-600 focus:outline-none"
              />
            ) : (
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium focus:border-teal-600 focus:outline-none"
              >
                <option value="">Select destination</option>
                {otherWallets.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-ink-600">Date & time</label>
              <input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-ink-600">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {type === 'transfer' && otherWallets.length === 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Need at least 2 shared wallets for a transfer.</div>
          )}

          <button
            onClick={handleAdd}
            disabled={type === 'transfer' && !toWalletId}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" /> {type === 'transfer' ? 'Transfer' : 'Add to shared wallet'}
          </button>
        </div>

        <div className="glass rounded-[20px] p-5">
          <div className="flex items-center gap-2 text-sm font-black tracking-tight text-ink-900">
            <UsersIcon className="h-4 w-4" /> Members
          </div>
          <div className="mt-4 space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-ink-900">{m.email}</div>
                  <div className="text-xs font-semibold text-ink-600">{m.role}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${m.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-white text-ink-700'}`}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-[20px] p-5">
        <div className="text-sm font-black tracking-tight text-ink-900">Recent transactions</div>
        <div className="mt-4 space-y-2">
          {tx.length === 0 ? (
            <div className="rounded-2xl bg-white/60 px-4 py-8 text-center text-sm font-medium text-ink-600">No transactions yet. Add your first entry.</div>
          ) : (
            tx.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-ink-900">{t.category || 'Uncategorized'} • {t.type}</div>
                  <div className="text-xs font-medium text-ink-600">
                    {new Date(t.date).toLocaleString()} • {t.createdByEmail}
                  </div>
                  {t.notes && <div className="text-xs text-ink-600">{t.notes}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-ink-700'}`}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄ '}
                    {Number(t.amount).toLocaleString()}
                  </div>
                  <button onClick={() => handleDelete(t.externalId)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-700 hover:bg-red-50 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
