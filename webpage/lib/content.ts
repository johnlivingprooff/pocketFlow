import { adminEmail, betaWhatsappUrl, releaseUrl, RELEASE_VERSION } from '@/lib/links';

export const seo = {
  title: 'pocketFlow | Log an expense in two taps',
  description:
    'A fast, offline money tracker for Android. Record expenses and income in a couple of taps, keep your data on your device, and download the APK.',
};

export const hero = {
  eyebrow: 'Offline-first money tracker for Android',
  headline: 'Log an expense in two taps.',
  subheadline:
    'pocketFlow makes recording money quick and private. Add an expense or income, see what matters, and get on with your day.',
  primaryCta: 'Download APK',
  primaryHref: releaseUrl,
  note: `v${RELEASE_VERSION} · Android · No sign-up`,
};

export const proof = [
  {
    title: 'Two taps to log',
    body: 'Open the app, tap Add expense or Add income, and you are done.',
  },
  {
    title: 'Works offline',
    body: 'Records stay on your device. No account and no connection needed.',
  },
  {
    title: 'Wallets kept straight',
    body: 'Track cash, bank, and mobile money without double-counting transfers.',
  },
];

export const cta = {
  headline: 'Get pocketFlow.',
  body: 'Download the latest APK directly to your Android device.',
  primary: 'Download APK',
  primaryHref: releaseUrl,
  betaLabel: 'Join the beta group on WhatsApp',
  betaHref: betaWhatsappUrl,
  note: `v${RELEASE_VERSION} · 60 MB · Questions? ${adminEmail}`,
};
