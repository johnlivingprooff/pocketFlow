'use client';

import { useState, useEffect, useRef } from 'react';
import { howItWorks } from '@/lib/content';

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
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

  return (
    <section
      ref={sectionRef}
      className={`py-20 section-shell lg:py-28 bg-gradient-to-b from-ink-900 to-ink-800 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      id="how-it-works"
    >
      <div className="flex flex-col items-center gap-6 mb-16 text-center">
        <h2 className="text-3xl font-bold lg:text-4xl text-sand-50">Simple workflow</h2>
      </div>
      
      {/* Horizontal Timeline */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-12 sm:gap-8">
          {howItWorks.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              onMouseEnter={() => setActiveStep(i)}
              className="flex flex-col items-center flex-1 text-center transition-all duration-300 group"
            >
              <div className="relative flex items-center w-full">
                <div
                  className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full text-xl font-bold shadow-2xl transition-all duration-300 mx-auto z-10 ${
                    activeStep === i
                      ? 'bg-gold-500 text-ink-900 scale-110 shadow-gold-500/50'
                      : 'bg-gold-600/30 text-sand-300 group-hover:bg-gold-600/50 group-hover:scale-105'
                  }`}
                >
                  {i + 1}
                </div>
                {i < howItWorks.length - 1 && (
                  <div
                    className={`absolute left-[calc(50%+28px)] sm:left-[calc(50%+32px)] right-[-50%] h-1 transition-all duration-500 ${
                      activeStep >= i
                        ? 'bg-gradient-to-r from-gold-500 to-gold-600'
                        : 'bg-gradient-to-r from-ink-700 to-ink-800'
                    }`}
                  />
                )}
              </div>
              <div className="mt-6 transition-all duration-300">
                <h3
                  className={`text-lg sm:text-xl font-bold mb-2 transition-colors duration-300 ${
                    activeStep === i ? 'text-gold-500' : 'text-sand-50 group-hover:text-gold-400'
                  }`}
                >
                  {step.title}
                </h3>
              </div>
            </button>
          ))}
        </div>
        
        {/* Active Step Detail */}
        <div className="relative min-h-[120px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-600/10 to-transparent rounded-3xl" />
          <div className="relative z-10 max-w-2xl p-6 mx-auto text-center sm:p-8">
            <p
              className="text-base leading-relaxed transition-all duration-300 sm:text-lg text-sand-100"
              key={activeStep}
            >
              {howItWorks[activeStep].body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
