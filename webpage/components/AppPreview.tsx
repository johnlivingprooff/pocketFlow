type TransactionRowProps = {
  name: string;
  meta: string;
  amount: string;
  positive?: boolean;
};

function TransactionRow({ name, meta, amount, positive = false }: TransactionRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}
      >
        {positive ? '+' : '−'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-teal-900">{name}</span>
        <span className="block truncate text-[10px] text-slate-500">{meta}</span>
      </span>
      <span className={`text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
        {amount}
      </span>
    </div>
  );
}

export function AppPreview() {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-24px_rgba(15,118,110,0.35)]">
      <div className="overflow-hidden rounded-[1.5rem] bg-slate-50">
        <div className="flex items-center justify-between px-5 pb-1 pt-4 text-[10px] font-semibold text-slate-500">
          <span>9:41</span>
          <span className="tracking-widest">•••</span>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">pocketFlow</p>
          <p className="mt-1 text-lg font-bold text-teal-900">Good morning, John.</p>
          <p className="text-[11px] text-slate-500">Record money fast, then get out of the way.</p>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Ready to record
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-teal-900">MWK 125,450</p>
          <p className="mt-1 text-[10px] text-slate-500">Default wallet · Cash</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="rounded-xl bg-red-500 py-2.5 text-center text-[11px] font-bold text-white">
              Add expense
            </span>
            <span className="rounded-xl bg-emerald-500 py-2.5 text-center text-[11px] font-bold text-white">
              Add income
            </span>
            <span className="rounded-xl border border-slate-200 py-2 text-center text-[10px] font-semibold text-teal-900">
              Transfer
            </span>
            <span className="rounded-xl border border-slate-200 py-2 text-center text-[10px] font-semibold text-teal-900">
              History
            </span>
          </div>
        </div>

        <div className="px-5 pb-2 pt-5">
          <p className="text-xs font-bold text-teal-900">Recent</p>
        </div>
        <div className="space-y-2 px-4 pb-5">
          <TransactionRow name="Groceries" meta="Today · Cash" amount="−5,200" />
          <TransactionRow name="Freelance" meta="Yesterday · Mobile money" amount="+25,000" positive />
        </div>

        <div className="flex items-center justify-around border-t border-slate-200 bg-white py-3 text-[10px] font-semibold">
          <span className="text-teal-700">Home</span>
          <span className="text-slate-400">Wallets</span>
          <span className="text-slate-400">Stats</span>
          <span className="text-slate-400">Settings</span>
        </div>
      </div>
    </div>
  );
}
