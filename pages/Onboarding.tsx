import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Wind, Flame, Award, MessageCircle, ArrowRight, Check, Sparkles, User, Brain, Heart, Clock, Layout, Zap, ArrowLeft, Leaf, CloudRain, Sun, Smile, Loader2, Calendar } from 'lucide-react';
import { UserPreferences } from '../types';
import { saveOnboardingPreferences } from '../services/onboardingService';

// --- QUIZ CONFIG ---
interface QuestionOption {
  id: string;
  label: string;
  icon?: any;
}

interface Question {
  id: keyof UserPreferences;
  question: string;
  type: 'SINGLE' | 'MULTI';
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: 'motivations',
    question: "What brings you to The School of Breath?",
    type: 'MULTI',
    options: [
      { id: 'stress', label: 'Reduce stress & anxiety', icon: Leaf },
      { id: 'sleep', label: 'Sleep deeper', icon: MoonIcon },
      { id: 'focus', label: 'Improve focus & clarity', icon: Brain },
      { id: 'health', label: 'Better overall health', icon: ActivityIcon },
      { id: 'spiritual', label: 'Spiritual growth', icon: Sparkles },
      { id: 'habit', label: 'Build a daily routine', icon: CalendarIcon },
    ]
  },
  {
    id: 'experienceLevel',
    question: "How experienced are you with breathwork?",
    type: 'SINGLE',
    options: [
      { id: 'new', label: "I'm brand new", icon: Wind },
      { id: 'little', label: "I've practiced a little", icon: CloudRain },
      { id: 'weekly', label: "I practice weekly", icon: Sun },
      { id: 'daily', label: "I practice daily", icon: Flame },
    ]
  },
  {
    id: 'preferredPractices',
    question: "What type of practices do you enjoy the most?",
    type: 'MULTI',
    options: [
      { id: 'breathwork', label: 'Breathwork Practice', icon: Wind },
      { id: 'courses', label: 'Our Courses', icon: Layout },
      { id: 'meditation', label: 'Meditation', icon: Brain },
      { id: 'mantras', label: 'Mantras', icon: Sun },
      { id: 'music', label: 'Sleep Music', icon: MessageCircle },
    ]
  },
  {
    id: 'sessionDuration',
    question: "How long do you want to practice breathwork every day?",
    type: 'SINGLE',
    options: [
      { id: '5min', label: '5 minutes', icon: Clock },
      { id: '10min', label: '10 minutes', icon: Clock },
      { id: '20min', label: '20 minutes', icon: Clock },
      { id: '30min', label: '30+ minutes', icon: Clock },
    ]
  }
];

// Helper Icons
function MoonIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> }
function CalendarIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> }
function TrophyIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> }
function StarIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function ActivityIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> }

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { markOnboardingComplete, saveUserPreferences, hasCompletedOnboarding, isOnboardingStatusResolved } = useApp();

  useEffect(() => {
    if (!isOnboardingStatusResolved) return;
    if (hasCompletedOnboarding) navigate('/');
  }, [hasCompletedOnboarding, isOnboardingStatusResolved, navigate]);
  
  // State: Added WELCOME as the starting view
  const [view, setView] = useState<'WELCOME' | 'QUIZ' | 'PROCESSING'>('WELCOME');
  const [questionIndex, setQuestionIndex] = useState(0);
  
  // Answers Storage
  const [answers, setAnswers] = useState<UserPreferences>({
    motivations: [],
    experienceLevel: '',
    preferredPractices: [],
    sessionDuration: '',
    supportType: [],
    desiredFeelings: []
  });

  // --- QUIZ LOGIC ---
  const handleOptionSelect = (qId: keyof UserPreferences, optionId: string, type: 'SINGLE' | 'MULTI') => {
    setAnswers(prev => {
      if (type === 'SINGLE') {
        return { ...prev, [qId]: optionId };
      } else {
        const currentArr = prev[qId] as string[];
        const exists = currentArr.includes(optionId);
        if (exists) {
          return { ...prev, [qId]: currentArr.filter(id => id !== optionId) };
        } else {
          return { ...prev, [qId]: [...currentArr, optionId] };
        }
      }
    });
  };

  const isCurrentQuestionValid = () => {
    const q = QUESTIONS[questionIndex];
    const val = answers[q.id];
    if (Array.isArray(val)) return val.length > 0;
    return val !== '';
  };

  const handleQuizNext = () => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(prev => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleQuizBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1);
    } else {
        // If at first question, go back to Welcome screen
        setView('WELCOME');
    }
  };

  const finishOnboarding = async () => {
    setView('PROCESSING');
    
    // Save data
    saveUserPreferences(answers);
    try {
      await saveOnboardingPreferences(answers);
      markOnboardingComplete();
    } catch (error) {
      console.error('[Onboarding] Failed to save onboarding preferences', error);
    }

    // Fake loading for effect
    setTimeout(() => {
        navigate('/');
    }, 2500);
  };

  // --- RENDER WELCOME SCREEN ---
  if (view === 'WELCOME') {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Emotional Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-dark to-[#1e3a4a] z-0"></div>
            
            {/* Warm Glows for Emotion */}
            <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            {/* Fun Visual: Floating Card/Orb */}
            <div className="relative z-10 mb-12 animate-float">
                <div className="w-32 h-32 bg-gradient-to-tr from-[#E6F2F5] to-white rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)] transform rotate-6 border border-white/20">
                     <Wind size={64} className="text-brand-dark animate-pulse-slow" />
                </div>
                {/* Playful Particles */}
                <div className="absolute -top-6 -right-6 text-brand-gold animate-bounce" style={{ animationDuration: '3s' }}>
                    <Sparkles size={32} />
                </div>
                <div className="absolute top-1/2 -left-12 text-pink-300 animate-spin-slow" style={{ animationDuration: '10s' }}>
                     <Sun size={24} />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-sm px-4 space-y-4">
                <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-[#E6F2F5] to-brand-gold/70 leading-tight tracking-tight drop-shadow-md pb-2">
                    School of Breath 2.0
                </h1>
                <p className="text-[#E6F2F5]/90 text-base leading-relaxed font-light">
                    Your personal coach for adaptive breathwork, meditation, and healing music
                </p>
            </div>

            {/* Start Button */}
            <div className="relative z-10 w-full max-w-xs mt-12 pb-safe">
                <button
                    onClick={() => setView('QUIZ')}
                    className="
                        w-full h-12 bg-gradient-to-r from-brand-primary to-[#244A5C] text-white 
                        rounded-2xl font-bold text-lg shadow-lg hover:shadow-glow 
                        hover:scale-[1.02] hover:tracking-wide active:scale-[0.98] 
                        transition-all flex items-center justify-center gap-2 group
                    "
                >
                    Begin Journey 
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
  }

  // --- RENDER PROCESSING ---
  if (view === 'PROCESSING') {
      return (
          <div className="min-h-screen bg-white dark:bg-brand-darkBase flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 dark:from-brand-darkBase via-white dark:via-brand-darkSurface to-pink-50 dark:to-brand-darkBase animate-pulse-slow"></div>
               
               <div className="relative z-10 text-center p-8">
                   <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-spin-slow">
                        <Loader2 className="text-white animate-spin" size={40} />
                   </div>
                   <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-white mb-2 animate-fade-in">Personalizing your path...</h2>
                   <p className="text-gray-500 dark:text-gray-400 animate-fade-in" style={{ animationDelay: '0.5s' }}>Curating rituals for {answers.motivations.length > 0 ? 'your goals' : 'you'}.</p>
               </div>
          </div>
      );
  }

  // --- RENDER QUIZ ---
  const activeQuestion = QUESTIONS[questionIndex];
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-darkBase flex flex-col font-sans transition-colors duration-300">
        {/* Header */}
        <div className="bg-white dark:bg-brand-darkSurface px-6 pt-12 pb-6 shadow-sm sticky top-0 z-20 transition-colors duration-300">
             <div className="flex items-center justify-between mb-4">
                 <div className="w-8">
                    {/* Always allow back: If index 0, goes back to Welcome */}
                    <button 
                      onClick={handleQuizBack} 
                      className="relative p-3 -ml-2 rounded-full hover:bg-white/80 dark:hover:bg-white/20 transition-all duration-300 border-2 border-brand-gold/30 dark:border-brand-gold/20 shadow-lg shadow-brand-gold/10 dark:shadow-brand-gold/5 active:scale-95 group"
                      style={{
                        boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <ArrowLeft size={24} className="relative z-10 text-brand-dark dark:text-white group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
                    </button>
                 </div>
                 <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                     Step {questionIndex + 1} of {QUESTIONS.length}
                 </span>
                 <div className="w-8"></div> {/* Spacer */}
             </div>
             {/* Progress Bar */}
             <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-brand-dark dark:bg-brand-gold transition-all duration-500 ease-out"
                    style={{ width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }}
                 ></div>
             </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 animate-fade-in">
             <div className="max-w-md mx-auto">
                 {/* Reverted Size */}
                 <h1 className="text-2xl font-serif font-bold text-gray-800 dark:text-white mb-2 leading-tight">
                     {activeQuestion.question}
                 </h1>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                     {activeQuestion.type === 'MULTI' ? 'Select all that apply' : 'Select one option'}
                 </p>

                 <div className="grid grid-cols-1 gap-3">
                     {activeQuestion.options.map((opt) => {
                         const Icon = opt.icon || Check;
                         const isSelected = activeQuestion.type === 'SINGLE' 
                            ? answers[activeQuestion.id] === opt.id
                            : (answers[activeQuestion.id] as string[]).includes(opt.id);

                         return (
                             <button
                                key={opt.id}
                                onClick={() => handleOptionSelect(activeQuestion.id, opt.id, activeQuestion.type)}
                                className={`
                                    relative p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-200 group
                                    ${isSelected 
                                        ? 'border-brand-dark dark:border-brand-gold bg-brand-light/30 dark:bg-brand-gold/10 shadow-md transform scale-[1.02]' 
                                        : 'border-transparent bg-white dark:bg-brand-darkSurface shadow-md hover:border-brand-light dark:hover:border-gray-700 dark:hover:bg-white/5'
                                    }
                                `}
                             >
                                 <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                                    ${isSelected ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark' : 'bg-brand-dark dark:bg-white/10 text-white dark:text-gray-400'}
                                 `}>
                                     <Icon size={24} />
                                 </div>
                                 <div className="flex-1">
                                     <span className={`font-bold text-base ${isSelected ? 'text-brand-dark dark:text-white' : 'text-brand-dark dark:text-gray-300'}`}>
                                         {opt.label}
                                     </span>
                                 </div>
                                 <div className={`
                                     w-6 h-6 rounded-full border-2 flex items-center justify-center
                                     ${isSelected ? 'border-brand-dark dark:border-brand-gold bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark' : 'border-gray-200 dark:border-gray-600'}
                                 `}>
                                     {isSelected && <Check size={14} strokeWidth={3} />}
                                 </div>
                             </button>
                         );
                     })}
                 </div>
             </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-brand-darkSurface border-t border-gray-100 dark:border-gray-800 p-6 pb-safe z-20 transition-colors duration-300">
            <button
                onClick={handleQuizNext}
                disabled={!isCurrentQuestionValid()}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl
                    ${isCurrentQuestionValid() 
                        ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark shadow-brand-dark/20 dark:shadow-brand-gold/20 hover:scale-[1.02]' 
                        : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/30 cursor-not-allowed'}
                `}
            >
                {questionIndex === QUESTIONS.length - 1 ? 'Create My Plan' : 'Continue'}
            </button>
        </div>
    </div>
  );
};
