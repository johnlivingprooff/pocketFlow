import { adminEmail, betaWhatsappUrl, releaseUrl } from '@/lib/links';

export const seo = {
  title: 'pocketFlow | Trusted offline-first finance tracker',
  description:
    'PocketFlow is an offline-first finance app for wallets, transactions, and receipts.',
};

export const navigationLinks = [
  { label: 'Features', href: '#capabilities' },
  { label: 'Access', href: '#access' },
];

export const hero = {
  headline: 'Finance tracking you can trust.',
  subheadline: 'Track wallets, spending, and goals in one place.',
  primaryCta: 'Join beta-test WhatsApp group',
  primaryHref: betaWhatsappUrl,
  secondaryCta: 'Get email updates',
  secondaryHref: '#access',
  assurancePoints: ['Data stored on your device first'],
  trustMetrics: [
    { value: 'Offline-first', label: 'Local data' },
    { value: 'Multi-wallet', label: 'Cash + bank + mobile money' },
  ],
};

export const philosophy = {
  title: 'Clear records, clear decisions.',
  body: 'PocketFlow is designed for practical cash-flow visibility, not dashboard clutter.',
};

export const trustPillars = [
  {
    title: 'Data ownership',
    body: 'Records are stored locally first, with backup export when you need it.',
  },
  {
    title: 'Transparent reporting',
    body: 'Transfers are excluded from spend analytics for cleaner totals.',
  },
];

export const securityChecklist = [
  'Offline-first architecture',
  'Optional biometric lock',
  'Public release history',
];

export const newInfo = [
  {
    title: 'Quiet-hour reminders',
    body: 'Daily reminders with no-disturb windows.',
  },
  {
    title: 'JSON backup and restore',
    body: 'Move your records when needed.',
  },
];

export const features = [
  {
    title: 'Wallet tracking',
    body: 'Track cash, mobile money, and bank balances together.',
    detail: 'One view of total available funds.',
  },
  {
    title: 'Smart transaction logging',
    body: 'Log income, expenses, transfers, and receipts quickly.',
    detail: 'Category structure keeps reports clean.',
  },
  {
    title: 'Budgets and goals',
    body: 'Set limits and savings targets with quick progress checks.',
    detail: 'Useful for weekly and monthly planning.',
  },
];

export const howItWorks = [
  {
    title: 'Capture',
    body: 'Log daily income and spending.',
  },
  {
    title: 'Review',
    body: 'Check wallet totals and trends.',
  },
  {
    title: 'Adjust',
    body: 'Update budgets and stay on plan.',
  },
];

export const useCases = [
  {
    title: 'Household planning',
    body: 'Keep weekly essentials within budget.',
  },
  {
    title: 'Cash + mobile money',
    body: 'Track all wallets without double-counting transfers.',
  },
];

export const cta = {
  headline: 'Join beta access on WhatsApp.',
  body: 'Get early builds before public launch.',
  primary: 'Join beta WhatsApp group',
  primaryHref: betaWhatsappUrl,
  secondary: 'View latest release',
  secondaryHref: releaseUrl,
  waitlistTitle: 'Prefer email updates?',
  waitlistAction: 'Join waitlist',
  promise: `Emails from ${adminEmail}.`,
};
