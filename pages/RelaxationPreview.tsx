import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RelaxationTriangleTutorial } from '../components/RelaxationTriangleTutorial';

export const RelaxationPreview: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#063244] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-[0.2em]"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full max-w-md px-6 flex flex-col items-center gap-8">
        <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-white/70">
          Relaxation Preview
        </h1>
        <div className="w-full aspect-video bg-[#063244] rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex items-center justify-center">
          <RelaxationTriangleTutorial />
        </div>
        <p className="text-center text-xs text-white/70 leading-relaxed max-w-sm">
          Inhale nose 4 · Hold 7 · Exhale mouth 8. Watch the pearl move around the triangle and
          follow its rhythm for deep relaxation before sleep.
        </p>
      </div>
    </div>
  );
};

