import Image from 'next/image';

export function Screens() {
  const screens = [
    { src: '/screens/home page.jpg', alt: 'pocketFlow home dashboard with wallet overview and quick actions' },
    { src: '/screens/wallets page.jpg', alt: 'Multiple wallet management with balances' },
    { src: '/screens/add_transaction page.jpg', alt: 'Transaction creation form with category selection' },
    { src: '/screens/analytics.jpg', alt: 'Analytics dashboard showing income vs expense breakdown' },
    { src: '/screens/categories_page.jpg', alt: 'Category management with custom categories' },
    { src: '/screens/settings_page.jpg', alt: 'App settings including theme and currency options' },
  ];

  return (
    <section className="section-shell py-12 lg:py-16" id="screens">
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-ink-900 dark:text-sand-50">Product surfaces</h2>
        <p className="text-base text-ink-700 dark:text-sand-200 max-w-3xl">
          Real screenshots from the mobile app: wallet tracking, transaction logging, analytics, and settings.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen, idx) => (
          <div key={idx} className="card overflow-hidden">
            <div className="relative aspect-[9/16]">
              <Image
                src={screen.src}
                alt={screen.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
