import Image from 'next/image';
import Link from 'next/link';
import { releaseUrl } from '@/lib/links';

export function Navigation() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="section-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/app_icon.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg"
            priority
          />
          <span className="font-display text-base font-bold tracking-tight text-teal-900">pocketFlow</span>
        </Link>
        <div className="flex items-center gap-6">
          <a href="#why" className="hidden text-sm font-medium text-slate-600 hover:text-teal-700 sm:block">
            Why pocketFlow
          </a>
          <Link href={releaseUrl} className="btn-primary px-4 py-2 text-sm">
            Download
          </Link>
        </div>
      </div>
    </header>
  );
}
