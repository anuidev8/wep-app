import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, TrendingUp, Leaf, Zap, Moon, Scale, Target, Heart, Lock, 
    Wind, Play, Info, ChevronLeft
} from 'lucide-react';
import { PATTERNS } from '../types';
import { triggerHaptic } from '../utils/hapticFeedback';
import { getTechniqueInfo } from '../data/techniques';
import { TechniqueIntroCard } from '../components/TechniqueIntroCard';
import { motion, AnimatePresence } from 'framer-motion';

export const PatternSelection: React.FC = () => {
    const navigate = useNavigate();
    const { membershipStatus } = useApp();
    const isSubscribed = membershipStatus === 'Premium Membership';
    
    const [selectionMode, setSelectionMode] = useState<'GOAL' | 'LIST'>('GOAL');
    const [showTechniqueIntro, setShowTechniqueIntro] = useState<string | null>(null);
    const [techniqueIntroForced, setTechniqueIntroForced] = useState(false);

    const handleGoalSelect = (goal: string) => {
        const goalMap: Record<string, string> = {
            'Relaxed': 'CALM', 'Energized': 'ENERGY', 'Sleepy': 'REST', 'Balanced': 'BALANCE', 'Focused': 'FOCUS', 'Vitality': 'BHASTRIKA'
        };
        navigate(`/breathe?pattern=${goalMap[goal] || 'CALM'}`);
    };

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-[#0f2735] text-white flex flex-col overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f2f3c] via-[#16536a] to-[#0f2735]" />
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#D4A574]/5 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#1A4D5C]/20 rounded-full blur-[100px]" />
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:20px_20px]" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full relative z-10 flex flex-col pt-safe pb-safe overflow-hidden">
                <div 
                    className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-6"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {/* Header Row */}
                    <div className="flex items-center justify-between pt-10 pb-6 relative z-20">
                        <button
                            onClick={() => {
                                triggerHaptic('light');
                                navigate(-1);
                            }} 
                            className="relative w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-all duration-200 active:scale-95 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                            aria-label="Back"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {selectionMode === 'GOAL' && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A574]/10 border border-[#D4A574]/20 animate-fade-in">
                                <Sparkles size={14} className="text-[#D4A574]" />
                                <span className="text-[#D4A574] font-bold uppercase tracking-[0.15em] text-[10px]">Shift Your State</span>
                            </div>
                        )}
                        
                        {/* Spacer to balance the back button for perfect centering */}
                        <div className="w-10" />
                    </div>

                    <AnimatePresence mode='wait'>
                        {selectionMode === 'GOAL' ? (
                            <motion.div 
                                key="goal"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex flex-col pb-8"
                            >
                                {/* Header Section - Centered */}
                                <div className="flex-1 flex flex-col justify-center min-h-[120px] max-h-[180px]">
                                    <div className="text-center px-4">
                                        <h2 className="text-[28px] leading-tight font-serif font-bold text-white mb-4 drop-shadow-md">
                                            How do you want<br/>to feel?
                                        </h2>
                                        <p className="text-white/70 text-[15px] leading-relaxed max-w-xs mx-auto font-medium">
                                            Select a state to begin.
                                        </p>
                                    </div>
                                </div>

                                {/* Grid Section */}
                                <div className="grid grid-cols-2 gap-4 mb-6 mt-6">
                                     {[
                                         { id: 'Relaxed', icon: Leaf, topColor: 'bg-emerald-500', iconColor: 'text-emerald-300', gradient: 'from-emerald-900/40 to-emerald-900/10' },
                                         { id: 'Energized', icon: Zap, topColor: 'bg-amber-500', iconColor: 'text-amber-300', gradient: 'from-amber-900/40 to-amber-900/10' },
                                         { id: 'Sleepy', icon: Moon, topColor: 'bg-indigo-500', iconColor: 'text-indigo-300', gradient: 'from-indigo-900/40 to-indigo-900/10' },
                                         { id: 'Balanced', icon: Scale, topColor: 'bg-teal-500', iconColor: 'text-teal-300', gradient: 'from-teal-900/40 to-teal-900/10' },
                                         { id: 'Focused', icon: Target, topColor: 'bg-slate-400', iconColor: 'text-slate-200', gradient: 'from-slate-800/40 to-slate-800/10' },
                                         { id: 'Vitality', icon: Heart, topColor: 'bg-rose-500', iconColor: 'text-rose-300', gradient: 'from-rose-900/40 to-rose-900/10' },
                                     ].map((mood) => {
                                         const isLocked = !isSubscribed && mood.id !== 'Relaxed';
                                         
                                         return (
                                         <button
                                            key={mood.id}
                                            onClick={() => {
                                                triggerHaptic('medium');
                                                if (isLocked) {
                                                    navigate('/subscription');
                                                } else {
                                                    handleGoalSelect(mood.id);
                                                }
                                            }}
                                            className={`group relative overflow-hidden rounded-[24px] p-4 transition-all duration-300 active:scale-[0.97] flex flex-col items-center justify-center gap-3 aspect-[1.35/1] border border-white/5 shadow-lg ${isLocked ? 'opacity-85' : ''}`}
                                         >
                                             {/* Card Background with Gradient */}
                                             <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-60 group-hover:opacity-80 transition-opacity`} />
                                             <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
                                             
                                             {/* Top Accent Line */}
                                             <div className={`absolute top-0 left-0 right-0 h-[3px] ${mood.topColor} opacity-80`} />
                                             
                                             {/* Icon Circle */}
                                             <div className={`relative w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                                                 <mood.icon size={22} className={mood.iconColor} strokeWidth={2} />
                                             </div>
                                             
                                             {/* Label */}
                                             <span className="text-white font-bold text-[15px] tracking-wide relative z-10 flex items-center gap-1.5">
                                                 {mood.id}
                                                 {isLocked && <Lock size={12} className="text-[#D4A574]" />}
                                             </span>
                                             
                                             {/* Lock Overlay */}
                                             {isLocked && (
                                                 <div className="absolute top-2 right-2">
                                                     <div className="bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
                                                         <Lock size={10} className="text-white/70" />
                                                     </div>
                                                 </div>
                                             )}
                                         </button>
                                     )})}
                                </div>

                                {/* Footer Action */}
                                <div className="mt-auto pt-2 pb-4 flex justify-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setSelectionMode('LIST');
                                        }}
                                        className="px-6 py-3.5 rounded-full text-[#D4A574] text-xs font-bold uppercase tracking-[0.15em] border border-[#D4A574]/30 bg-[#D4A574]/5 hover:bg-[#D4A574]/10 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(212,165,116,0.1)]"
                                    >
                                        Browse All Techniques
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="flex flex-col pb-8"
                            >
                                <div className="text-center mb-8 pt-4">
                                    <h2 className="text-2xl font-serif font-bold text-white mb-2">Breathing Techniques</h2>
                                    <p className="text-brand-light/60 text-sm font-medium">Explore our library of ancient practices</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                     {Object.values(PATTERNS).map(pattern => {
                                         const techniqueInfo = getTechniqueInfo(pattern.id);
                                         const isLocked = !isSubscribed && pattern.id !== 'CALM';
                                         
                                         return (
                                          <div 
                                             key={pattern.id}
                                             onClick={(e) => {
                                                 const target = e.target as HTMLElement;
                                                 const isInfoButton = target.closest('button[aria-label*="Learn more"]');
                                                 if (isInfoButton) return;
                                                 
                                                 if (isLocked) {
                                                     triggerHaptic('light');
                                                     navigate('/subscription');
                                                     return;
                                                 }
                                                 
                                                 triggerHaptic('medium');
                                                 navigate(`/breathe?pattern=${pattern.id}`);
                                             }}
                                             role="button"
                                             tabIndex={0}
                                             className={`w-full bg-white/5 active:bg-white/10 border border-white/10 rounded-[24px] p-5 flex items-center gap-4 cursor-pointer transition-all duration-200 active:scale-[0.98] relative group ${isLocked ? 'opacity-70 grayscale-[0.3]' : ''}`}
                                            >
                                             {/* Pattern Icon */}
                                             <div className={`w-14 h-14 rounded-2xl ${pattern.colorClass} flex items-center justify-center text-white font-bold text-xl shadow-lg border border-white/10 flex-shrink-0`}>
                                                 {pattern.name.substring(0, 1)}
                                             </div>

                                             <div className="flex-1 min-w-0">
                                                 <div className="flex items-center gap-2 mb-1">
                                                     <h4 className="text-white font-bold text-[17px] tracking-tight">
                                                         {pattern.name}
                                                     </h4>
                                                     {isLocked && <Lock size={14} className="text-[#D4A574]" />}
                                                 </div>
                                                 <p className="text-brand-light/60 text-xs leading-snug line-clamp-2">{pattern.benefit}</p>
                                             </div>

                                             <div className="flex items-center gap-3">
                                                 {techniqueInfo && (
                                                     <button
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             triggerHaptic('light');
                                                             setTechniqueIntroForced(true);
                                                             setShowTechniqueIntro(pattern.id);
                                                         }}
                                                         className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                                         aria-label={`Learn more about ${pattern.name}`}
                                                     >
                                                         <Info size={16} />
                                                     </button>
                                                 )}
                                                 
                                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isLocked ? 'bg-transparent border-white/10 text-white/30' : 'bg-white text-brand-dark border-white shadow-lg'}`}>
                                                     {isLocked ? <Lock size={16} /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                                                 </div>
                                             </div>
                                          </div>
                                         );
                                     })}
                                </div>
                                
                                <div className="mt-auto text-center pt-4">
                                 <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setSelectionMode('GOAL');
                                        }}
                                    className="px-6 py-3 rounded-full text-white/60 text-xs font-bold uppercase tracking-[0.15em] hover:text-white transition-colors"
                                 >
                                    Back to Mood Selection
                                 </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Technique Intro Card Overlay */}
            {showTechniqueIntro && getTechniqueInfo(showTechniqueIntro) && (
                <TechniqueIntroCard
                  technique={getTechniqueInfo(showTechniqueIntro)!}
                  onStart={() => {
                    navigate(`/breathe?pattern=${showTechniqueIntro}`);
                    setShowTechniqueIntro(null);
                    setTechniqueIntroForced(false);
                  }}
                  onClose={() => {
                    setShowTechniqueIntro(null);
                    setTechniqueIntroForced(false);
                  }}
                  forceShow={techniqueIntroForced}
                />
            )}
        </div>
    );
};
