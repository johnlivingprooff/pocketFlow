import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { UIScreens } from '@/components/UIScreens';
import { HowItWorks } from '@/components/HowItWorks';
import { CTA } from '@/components/CTA';
import { seo } from '@/lib/content';

export const metadata = {
  title: seo.title,
  description: seo.description,
};

export default function Page() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Features />
      <UIScreens />
      <HowItWorks />
      <CTA />
    </main>
  );
}
