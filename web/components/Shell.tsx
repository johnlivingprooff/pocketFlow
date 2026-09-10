'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HomeIcon, UsersIcon, LogOutIcon, SearchIcon } from './icons';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('pf_user');
    if (u) {
      try {
        setUserEmail(JSON.parse(u).email);
      } catch {}
    }
  }, []);

  const isActive = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  const handleLogout = () => {
    localStorage.removeItem('pf_access');
    localStorage.removeItem('pf_refresh');
    localStorage.removeItem('pf_user');
    router.push('/login');
  };

  if (pathname.startsWith('/login') || pathname.startsWith('/invite')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* Top glass nav */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-white shadow-glass">
                <span className="text-[11px] font-black tracking-widest">PF</span>
              </div>
              <div>
                <div className="text-[13px] font-extrabold tracking-tight text-ink-900">pocketFlow</div>
                <div className=" -mt-1 text-[11px] font-semibold text-teal-700">Shared wallets • Web</div>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isActive('/') && pathname === '/' ? 'bg-ink-900 text-white shadow' : 'text-ink-700 hover:bg-white/70'}`}
              >
                <HomeIcon className="h-4 w-4" /> Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userEmail ?? 'Not signed in'}
            </div>
            <Link href="/login" className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-900 shadow-sm ring-1 ring-black/5 hover:bg-white md:inline-flex">
              Manage account
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-700 shadow-sm ring-1 ring-black/5 hover:bg-white"
              aria-label="Logout"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr_360px]">
        {/* Left rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-[88px] space-y-4">
            <div className="glass rounded-[20px] p-3">
              <div className="space-y-1">
                <Link href="/" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${pathname === '/' ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-white/60'}`}>
                  <HomeIcon className="h-[18px] w-[18px]" /> Overview
                </Link>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 opacity-60">
                  <UsersIcon className="h-[18px] w-[18px]" /> Members <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">App only</span>
                </div>
              </div>
            </div>
            <div className="glass rounded-[20px] p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-600">App only on web</div>
              <p className="mt-2 text-sm leading-5 text-ink-700">Personal wallets, budgets, goals and SMS import stay on the Android/iOS app for offline privacy.</p>
            </div>
          </div>
        </aside>

        {/* Center */}
        <main className="min-w-0">{children}</main>

        {/* Right glass panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-[88px] space-y-4">
            <div className="glass-strong rounded-[24px] p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-600">Need the app?</div>
              <p className="mt-2 text-sm leading-6 text-ink-700">Full finance suite, offline personal wallets, receipt scan and SMS auto-log are mobile-only.</p>
              <a href="https://pf.eiteone.org/download" className="mt-4 inline-flex w-full justify-center rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white">
                Get the app
              </a>
            </div>
            <div className="glass rounded-[20px] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-600">
                <SearchIcon className="h-4 w-4" /> Tip
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-700">Wallets are created in the app. On the web, invite members and add income/expense — everything syncs via the cloud.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
