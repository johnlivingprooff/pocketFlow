import { adminEmail, betaWhatsappUrl, releaseUrl, RELEASE_VERSION } from '@/lib/links';

export const seo = {
  title: 'pocketFlow | Fast, offline-first money tracking',
  description:
    'PocketFlow helps you record expenses and income quickly, stay offline-first, and keep your financial flow simple.',
};

export const navigationLinks = [
  { label: 'Features', href: '#capabilities' },
  { label: 'Download', href: '#access' },
  { label: 'Latest APK', href: '/download' },
];

export const hero = {
  headline: 'Track money fast, without the clutter.',
  subheadline: 'PocketFlow is built for quick expense and income capture, clean history, and lightweight insights that stay out of your way.',
  primaryCta: 'Download APK',
  primaryHref: releaseUrl,
  secondaryCta: 'See download page',
  secondaryHref: '/download',
  assurancePoints: ['Offline-first and built for fast daily use'],
  trustMetrics: [
    { value: 'Quick entry', label: 'Expense and income in a few taps' },
    { value: 'Offline-first', label: 'Your records stay local first' },
  ],
};

export const philosophy = {
  title: 'Less dashboard, more flow.',
  body: 'PocketFlow is designed to help you record money quickly and review only what matters, instead of burying you in finance theater.',
};

export const trustPillars = [
  {
    title: 'Fast capture',
    body: 'Open the app and record an entry immediately, with smart defaults that reduce repeated work.',
  },
  {
    title: 'Local-first records',
    body: 'Your data is stored on-device first, with exports and backups when you need them.',
  },
];

export const securityChecklist = [
  'Offline-first architecture',
  'Optional biometric lock',
  'Direct APK release access',
];

export const newInfo = [
  {
    title: 'Quicker onboarding',
    body: 'Get into the app in three short steps.',
  },
  {
    title: 'Cleaner insights',
    body: 'See what matters without heavy dashboard noise.',
  },
];

export const features = [
  {
    title: 'Quick transaction logging',
    body: 'Add expenses, income, and transfers from a simpler, transaction-first home screen.',
    detail: 'Built to get out of your way after a few taps.',
  },
  {
    title: 'Clean history',
    body: 'Search, scan, and fix entries quickly with lighter filters and clearer lists.',
    detail: 'Faster review, less friction.',
  },
  {
    title: 'Lightweight insights',
    body: 'See income, spending, trends, and top categories without dashboard overload.',
    detail: 'Useful enough to act on, simple enough to trust.',
  },
];

export const howItWorks = [
  {
    title: 'Open',
    body: 'Launch straight into a fast, action-first experience.',
  },
  {
    title: 'Record',
    body: 'Capture expense, income, or transfer in a few taps.',
  },
  {
    title: 'Review',
    body: 'Check history and insights only when you need them.',
  },
];

export const useCases = [
  {
    title: 'Daily personal money tracking',
    body: 'Keep everyday spending and income records without slowing down your day.',
  },
  {
    title: 'Cash + bank + mobile money',
    body: 'Track multiple wallets cleanly without double-counting transfers.',
  },
];

export const cta = {
  headline: 'Download the latest pocketFlow APK.',
  body: 'Get the current Android build directly, or join the beta group for updates and feedback.',
  primary: 'Download APK',
  primaryHref: releaseUrl,
  secondary: 'Join beta WhatsApp group',
  secondaryHref: betaWhatsappUrl,
  waitlistTitle: 'Prefer release updates by email?',
  waitlistAction: 'Join waitlist',
  promise: `Current APK: v${RELEASE_VERSION} · Contact ${adminEmail} for support.`,
};
