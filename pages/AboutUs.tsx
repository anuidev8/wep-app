import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-dusk text-white">
      <div className="sticky top-0 z-10 bg-brand-midnight/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 px-6 py-4 pt-safe">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-serif font-bold">About Us</h1>
        </div>
      </div>

      <div className="relative px-6 pb-16 pt-8">
        <div className="absolute -top-24 right-[-10%] w-80 h-80 bg-brand-gold/10 rounded-full blur-[90px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-brand-primary/15 rounded-full blur-[90px]" />

        <div className="relative max-w-3xl mx-auto">
          <div className="bg-white/95 dark:bg-brand-darkSurface/95 text-brand-dark dark:text-brand-darkText rounded-3xl p-6 md:p-10 shadow-2xl border border-brand-light/60 dark:border-brand-darkBorder/60">
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-dark flex items-center justify-center shadow-lg">
                <span className="text-white font-serif font-bold text-2xl">AD</span>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-serif font-bold">The School of Breath</h2>
                <p className="text-sm md:text-base text-brand-primary dark:text-brand-darkTextMuted">
                  Founded by Abhi Duggal
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/15 text-brand-dark dark:text-brand-gold text-xs font-semibold tracking-wide">
                <Sparkles size={14} />
                Breathwork • Meditation • Sleep Music
              </div>
            </div>

            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted">
              Welcome to The School of Breath, a transformative platform created by Abhi Duggal, dedicated to improving your
              health, happiness, and overall well-being. Through the power of ancient breathing techniques, guided meditations,
              and soothing sleep music, we aim to help you unlock your potential, find inner peace, and cultivate a balanced
              life. Our approach combines the wisdom of traditional practices with modern wellness strategies, empowering you to
              reduce stress, enhance focus, and achieve emotional harmony. Whether you are a beginner or experienced in
              meditation and yoga, our resources are thoughtfully designed to meet you where you are and guide you towards a
              healthier, more mindful way of living. Join us on a journey of self-discovery and holistic growth, and experience
              how simple practices can bring profound transformation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
