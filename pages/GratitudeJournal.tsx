import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Heart,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// --- CONFIGURATION ---

const SACRED_QUESTIONS = [
  {
    id: 'safety',
    question: "What is the thing you are celebrating today in life?",
    placeholder: "For example: health, family, abundance, career, love, growth, peace, connection...",
  },
  {
    id: 'selflove',
    question: "What is one thing you genuinely appreciate about yourself or your life today, and why?",
    placeholder: "For example: I appreciate my patience today as I navigated a challenging conversation.",
  },
  {
    id: 'connection',
    question: "Who touched your heart today, and how can you send them kindness—through gratitude or understanding?",
    placeholder: "For example: My friend's kind message reminded me I'm not alone.",
  }
];

export const GratitudeJournal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gratitudeEntries, addGratitudeEntry, deleteGratitudeEntry, theme, gratitudeTodayCompleted } = useApp();
  
  // Get suggested gratitude from horoscope if available
  const suggestedGratitude = (location.state as any)?.suggestedGratitude || '';
  const fromHoroscope = (location.state as any)?.fromHoroscope || false;
  
  // State
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get today's date string in local time (YYYY-MM-DD)
  const getTodayStr = () => new Date().toLocaleDateString('en-CA');

  // Effect to populate form if today is already completed or if we have suggestions
  useEffect(() => {
    if (gratitudeTodayCompleted && gratitudeEntries.length > 0) {
      // Find today's entry
      const todayStr = getTodayStr();
      const todayEntry = gratitudeEntries.find(e => e.date === todayStr);
      
      // If found, populate answers (pad with empty strings if less than 3)
      if (todayEntry) {
        const newAnswers = [...todayEntry.items];
        while (newAnswers.length < 3) newAnswers.push('');
        setAnswers(newAnswers);
        return; // Don't overwrite with suggestion if already completed
      }
    }

    // Only use suggestion if we haven't completed today
    if (suggestedGratitude && answers[0] === '' && !gratitudeTodayCompleted) {
      setAnswers([suggestedGratitude, '', '']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedGratitude, gratitudeTodayCompleted, gratitudeEntries]);
  
  const handleSave = async () => {
    if (gratitudeTodayCompleted) return;

    const validAnswers = answers.filter(a => a.trim().length > 0);
    if (validAnswers.length === 0) {
        setError("Please write at least one gratitude reflection.");
        return;
    }
    
    // Check for minimum length
    if (!answers.some(a => a.trim().length > 3)) {
        setError("Please reflect a bit deeper (at least 3 characters).");
        return;
    }
    
    setIsSaving(true);
    setError(null);

    try {
      // Save all non-empty answers
      await addGratitudeEntry(validAnswers);
      // Don't clear answers, keep them displayed as "Today's Gratitude"
    } catch (err: any) {
      setError(err.message || 'Failed to save gratitude');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString: string) => {
    // If date is YYYY-MM-DD, parsing it as new Date(isoString) treats it as UTC midnight.
    // If we want to display it correctly in user timezone, we need to handle that.
    // Actually backend sends YYYY-MM-DD which is date-only.
    // We want to show "Monday, Jan 5"
    // Using simple string parsing to avoid timezone shifts:
    const [y, m, d] = isoString.split('-').map(Number);
    if (y && m && d) {
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }
    // Fallback for full ISO strings if any
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const hasValidEntry = answers.some(a => a.trim().length > 5);

  return (
    <div
      className={`min-h-screen flex flex-col bg-gradient-to-b ${
        theme === 'dark'
          ? 'from-brand-darkBase via-[#0B1121] to-brand-midnight'
          : 'from-[#F5F3F0] via-[#F5F3F0] to-[#F0F6F8]'
      }`}
    >
      {/* Header */}
      <div className="relative z-12 px-9 pt-12">
        <div className="flex items-center gap-3">
          <BackButton
            variant="adaptive"
            onClick={() => {
              if (fromHoroscope) {
                navigate('/horoscope-result');
              } else {
                navigate('/');
              }
            }}
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-serif font-black text-brand-dark dark:text-white leading-none">
              Gratitude
            </h1>
            <p className="text-[12px] font-bold text-brand-gold uppercase tracking-widest mt-1">
              Elevate your frequency
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-6 pb-32 mt-4 space-y-8">
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {/* Form: Show all 3 text areas */}
        <div className="bg-[#E8F4F8]/80 dark:bg-brand-dark/20 backdrop-blur-xl rounded-[21px] p-6 border border-brand-dark/20 dark:border-brand-dark/30 card-standard space-y-6">
          <div className="text-center mb-4">
            <p className="text-[15px] text-brand-primary dark:text-brand-darkTextMuted leading-relaxed">Three reflections to rewire your brain for safety and abundance.</p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
              <Heart size={20} className="text-brand-gold" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-brand-gold uppercase tracking-[0.2em]">
                {gratitudeTodayCompleted ? "Today's Completed Gratitude" : "Reflect on Today"}
              </p>
          
            </div>
          </div>

          {/* Scrollable container for all 3 questions */}
          <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
            {SACRED_QUESTIONS.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <p className="text-xs font-semibold text-brand-dark dark:text-white/90">
                  {question.question}
                </p>
                <textarea
                  value={answers[index]}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[index] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  rows={3}
                  placeholder={question.placeholder}
                  disabled={isSaving || gratitudeTodayCompleted}
                  className="w-full bg-white/70 dark:bg-black/30 rounded-2xl p-4 text-[15px] text-brand-dark dark:text-white border border-white/40 focus:border-brand-gold focus:ring-0 outline-none resize-none placeholder:text-brand-medium/40 dark:placeholder:text-white/30 disabled:opacity-70 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || gratitudeTodayCompleted || answers.every(a => a.trim().length === 0)}
            className={`mt-4 w-full py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 transition-all ${
              gratitudeTodayCompleted 
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default'
                : answers.every(a => a.trim().length === 0) 
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 opacity-60'
                  : 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark shadow-lg hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isSaving ? (
                <span className="animate-pulse">Saving...</span>
            ) : gratitudeTodayCompleted ? (
                <>
                    <CheckCircle2 size={16} />
                    Done for Today
                </>
            ) : (
                <>
                    <Plus size={16} />
                    Save Gratitude
                </>
            )}
          </button>
        </div>

        {/* History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar size={12} className="text-brand-medium/60 dark:text-brand-darkTextMuted" />
            <h3 className="text-[12px] font-black text-brand-medium/60 dark:text-brand-darkTextMuted uppercase tracking-[0.3em]">
              Past Gratitude
            </h3>
          </div>

          {gratitudeEntries.length === 0 ? (
            <div className="text-center py-10 opacity-40 text-xs italic">
              Your gratitude journey begins with your first reflection.
            </div>
          ) : (
            <div className="space-y-3">
              {gratitudeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/80 dark:bg-brand-darkSurface/70 backdrop-blur-xl rounded-[21px] p-5 border border-white/20 card-standard flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold text-brand-gold uppercase tracking-widest">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteGratitudeEntry(entry.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Delete gratitude entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {entry.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <Sparkles size={14} className="text-brand-gold mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-brand-dark/80 dark:text-brand-darkTextMuted leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
