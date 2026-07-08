import React, { useState, useEffect } from 'react';
import { ArrowLeft, Video, Image as ImageIcon, Loader2, Sparkles, Download, Play, LayoutTemplate, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateAffirmationImage, generateVisualisationVideo } from '../services/geminiService';

type StudioTab = 'VIDEO' | 'IMAGE';

const LOADING_STEPS = [
    "Dreaming up scenery...",
    "Calculaing light rays...",
    "Composing the elements...",
    "Rendering calmness...",
    "Polishing pixels...",
    "Almost there..."
];

export const Studio: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudioTab>('VIDEO');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');

  // Loading Step Rotation
  useEffect(() => {
    let interval: number;
    if (isLoading) {
        setLoadingStepIndex(0);
        interval = window.setInterval(() => {
            setLoadingStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setGeneratedContent(null);

    try {
      if (activeTab === 'VIDEO') {
        const validRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
        const videoUrl = await generateVisualisationVideo(prompt, validRatio);
        setGeneratedContent(videoUrl);
      } else {
        const imageUrl = await generateAffirmationImage(prompt, aspectRatio);
        setGeneratedContent(imageUrl);
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Creation interrupted. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedContent) return;
    
    try {
        // Convert blob/data URL to File for sharing
        const response = await fetch(generatedContent);
        const blob = await response.blob();
        const file = new File([blob], `sanctuary_${Date.now()}.${activeTab === 'VIDEO' ? 'mp4' : 'png'}`, { type: blob.type });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'My Sanctuary Creation',
                text: 'Created with The School of Breath',
                files: [file],
            });
        } else {
            // Fallback
            const a = document.createElement('a');
            a.href = generatedContent;
            a.download = file.name;
            a.click();
        }
    } catch (e) {
        console.error("Share failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-brand-darkBase flex flex-col pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-brand-darkSurface p-6 pt-12 shadow-sm z-10 transition-colors duration-300">
        <div className="flex items-center gap-4 mb-4">
             <button 
               onClick={() => navigate('/')} 
               className="relative p-3 bg-white/80 dark:bg-white/10 rounded-full hover:bg-white dark:hover:bg-white/20 transition-all duration-300 border-2 border-brand-gold/30 dark:border-brand-gold/20 shadow-lg shadow-brand-gold/10 dark:shadow-brand-gold/5 active:scale-95 group"
               style={{
                 boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
               }}
             >
               <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <ArrowLeft size={20} className="relative z-10 text-brand-dark dark:text-white group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
            </button>
            <div>
                {/* Reverted Size */}
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Sanctuary Studio</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Create your calm with AI.</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button 
                onClick={() => { setActiveTab('VIDEO'); setGeneratedContent(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'VIDEO' ? 'bg-white dark:bg-brand-darkSurface shadow-sm text-brand-dark dark:text-brand-gold' : 'text-gray-400 dark:text-gray-500'}`}
            >
                <Video size={16} /> Scapes (Veo)
            </button>
            <button 
                onClick={() => { setActiveTab('IMAGE'); setGeneratedContent(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'IMAGE' ? 'bg-white dark:bg-brand-darkSurface shadow-sm text-brand-dark dark:text-brand-gold' : 'text-gray-400 dark:text-gray-500'}`}
            >
                <ImageIcon size={16} /> Affirmations
            </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="bg-white dark:bg-brand-darkSurface p-6 rounded-3xl shadow-sm dark:shadow-none border border-gray-100 dark:border-brand-darkBorder mb-6 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-3 text-brand-medium dark:text-brand-darkTextMuted">
                <Sparkles size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Dream It</span>
            </div>
            
            <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'VIDEO' ? "E.g., A calm ocean at sunset with gentle waves..." : "E.g., A watercolor lotus flower with soft glowing light..."}
                className="w-full bg-gray-50 dark:bg-black/20 rounded-xl p-4 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-medium/20 dark:focus:ring-brand-gold/20 min-h-[140px] mb-6 resize-none dark:border dark:border-brand-darkBorder"
                disabled={isLoading}
            />

            <div className="flex items-center justify-between">
                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-2">
                    <LayoutTemplate size={16} className="text-gray-400" />
                    <select 
                        value={aspectRatio} 
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="bg-gray-50 dark:bg-black/20 text-xs font-bold text-gray-600 dark:text-gray-300 p-2.5 rounded-lg border-none focus:ring-0 cursor-pointer min-w-[120px]"
                        disabled={isLoading}
                    >
                        {activeTab === 'VIDEO' ? (
                            <>
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="9:16">Portrait (9:16)</option>
                            </>
                        ) : (
                            <>
                                <option value="1:1">Square (1:1)</option>
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="9:16">Portrait (9:16)</option>
                                <option value="3:4">Portrait (3:4)</option>
                                <option value="4:3">Landscape (4:3)</option>
                            </>
                        )}
                    </select>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className={`px-8 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-brand-medium/50 dark:shadow-glow-dark active:scale-95 ${isLoading || !prompt.trim() ? 'bg-gray-300 dark:bg-white/10' : 'bg-brand-dark dark:bg-brand-gold dark:text-brand-dark hover:bg-brand-medium'}`}
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isLoading ? 'Creating...' : 'Create'}
                </button>
            </div>
        </div>

        {/* Result Section */}
        {isLoading ? (
             <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
                 {/* Visual Loader */}
                 <div className="relative w-32 h-32 mb-8">
                     <div className="absolute inset-0 bg-brand-light dark:bg-white/10 rounded-full opacity-20 animate-ping"></div>
                     <div className="absolute inset-4 bg-brand-medium dark:bg-white/20 rounded-full opacity-20 animate-pulse"></div>
                     <div className="absolute inset-0 border border-brand-medium/30 dark:border-brand-darkBorder rounded-full animate-spin-slow"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-16 h-16 bg-gradient-to-br from-brand-medium to-brand-dark rounded-full shadow-lg flex items-center justify-center animate-float">
                             <Sparkles className="text-white opacity-80" size={24} />
                         </div>
                     </div>
                 </div>
                 
                 <h3 className="text-xl font-serif font-bold text-gray-800 dark:text-white mb-2">Making it conscious</h3>
                 <p key={loadingStepIndex} className="text-sm text-gray-500 dark:text-gray-400 animate-fade-in transition-opacity duration-500">
                     {LOADING_STEPS[loadingStepIndex]}
                 </p>
             </div>
        ) : generatedContent ? (
            <div className="animate-fade-in pb-10">
                 <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Your Creation</h2>
                 <div className="bg-black/5 dark:bg-black/40 rounded-3xl overflow-hidden border-4 border-white dark:border-brand-darkBorder shadow-lg dark:shadow-glow-dark relative">
                    {activeTab === 'VIDEO' ? (
                        <video 
                            src={generatedContent} 
                            autoPlay 
                            loop 
                            controls 
                            className="w-full h-auto max-h-[400px] object-contain bg-black"
                        />
                    ) : (
                        <img 
                            src={generatedContent} 
                            alt="Generated" 
                            className="w-full h-auto object-contain"
                        />
                    )}
                 </div>

                 {/* Actions accessible below content for mobile */}
                 <div className="mt-6 flex justify-center gap-4">
                     <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-brand-darkSurface rounded-full shadow-md text-sm font-bold text-brand-dark dark:text-white border border-gray-100 dark:border-white/10 active:scale-95"
                     >
                        <Share2 size={18} /> Share
                     </button>
                     <a 
                        href={generatedContent} 
                        download={`sanctuary_${Date.now()}.${activeTab === 'VIDEO' ? 'mp4' : 'png'}`} 
                        className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-full shadow-md text-sm font-bold active:scale-95"
                     >
                        <Download size={18} /> Save
                     </a>
                 </div>
                 <p className="text-center text-xs text-gray-400 mt-4">Saved to temporary memory.</p>
            </div>
        ) : (
            <div className="text-center py-12 opacity-40">
                <div className="w-20 h-20 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Ready to Visualize</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enter a prompt to generate calming visuals.</p>
            </div>
        )}
      </div>

    </div>
  );
};