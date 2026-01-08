'use client';

import { useEffect, useRef, useState } from 'react';

export function CTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullname.trim()) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          fullname: fullname.trim()
        }),
      });

      if (response.ok) {
        setMessage('Thanks for joining the waitlist! We\'ll be in touch soon.');
        setEmail('');
        setFullname('');
      } else {
        setMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`relative section-shell py-32 lg:py-40 overflow-hidden transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/assets/la-ferrari.jpg')] bg-cover bg-center" />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/80 via-ink-900/70 to-ink-900/90" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl lg:text-5xl font-bold text-sand-50">
          Take control of your finances
        </h2>
        <p className="text-xl text-sand-100">
          Start tracking your cash flow today. Offline-first, privacy-focused, built for clarity.
        </p>
        <div className="mt-4 w-full max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="Enter your full name"
              required
              className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gold-500 hover:bg-gold-600 disabled:bg-gold-500/50 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </button>
          </form>
          {message && (
            <p className="mt-4 text-sm text-sand-200">{message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
