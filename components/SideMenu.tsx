import React, { useMemo, useCallback } from 'react';
import {
    Home as HomeIcon, Star, Target, Heart, Settings as SettingsIcon, Sparkles, LogOut, Share2, Moon, Sun, MessageCircle, X, CheckCircle2, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUserInitials } from '../utils/userDisplay';
import { triggerHaptic } from '../utils/hapticFeedback';
import { motion, AnimatePresence } from 'framer-motion';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (msg: string) => void;
    setActiveOverlay: (overlay: 'LOGOUT' | null) => void;
    hasHoroscopeToday: boolean;
    hasIntentionToday: boolean;
    hasGratitudeToday: boolean;
    hasLiveMeditationToday?: boolean;
    userDisplayName: string;
    userEmail: string;
    userDisplayEmail: string;
    userFullName: string;
    /** Pre-resolved premium flag from membershipStatus (RevenueCat/Systeme.io sync). */
    isPremium: boolean;
    /** Whether membership status is still loading. */
    isMembershipLoading?: boolean;
}

export const SideMenu: React.FC<SideMenuProps> = ({
    isOpen,
    onClose,
    showToast,
    setActiveOverlay,
    hasHoroscopeToday,
    hasIntentionToday,
    hasGratitudeToday,
    hasLiveMeditationToday = false,
    userDisplayName,
    userEmail,
    userDisplayEmail,
    userFullName,
    isPremium,
    isMembershipLoading = false,
}) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useApp();

    const displayName = useMemo(() => 
        userDisplayName || userFullName || (userEmail ? userEmail.split('@')[0] : 'User') || '',
        [userDisplayName, userFullName, userEmail]
    );

    // Native-like easing curves (iOS/Android feel)
    // iOS: cubic-bezier(0.25, 0.46, 0.45, 0.94)
    // Material Design: cubic-bezier(0.4, 0.0, 0.2, 1)
    const nativeEasing = [0.25, 0.46, 0.45, 0.94];
    
    // Optimized transition configs
    const backdropTransition = useMemo(() => ({
        duration: 0.25,
        ease: nativeEasing
    }), []);

    const drawerTransition = useMemo(() => ({
        type: 'tween' as const,
        duration: 0.35,
        ease: nativeEasing
    }), []);

    const handleDragEnd = useCallback((_: any, info: any) => {
        if (info.offset.x < -50 || info.velocity.x < -300) {
            onClose();
        }
    }, [onClose]);

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);

    // Memoize menu sections to prevent recalculation on every render
    const menuSections = useMemo(() => [
        { section: '', items: [
            { icon: HomeIcon, label: 'Home', path: '/' },
        ]},
        { section: 'DAILY RITUALS', items: [
            { icon: Star, label: "Today's Horoscope", path: '/astrology', completed: hasHoroscopeToday },
            { icon: Target, label: "Today's Intention", path: '/intention', completed: hasIntentionToday },
            { icon: Heart, label: "Today's Gratitude", path: '/gratitude', completed: hasGratitudeToday },
            { icon: null, label: 'Live Meditation', path: '/live', useOnlineIcon: true, completed: hasLiveMeditationToday },
        ]},
        { section: 'ACCOUNT', items: [
            { icon: Crown, label: 'My Membership', path: '/subscription' },
            { icon: SettingsIcon, label: 'Settings', path: '/settings' },
            { icon: Sparkles, label: 'Ayurvedic Insights', path: null, comingSoon: true },
        ]},
    ], [hasHoroscopeToday, hasIntentionToday, hasGratitudeToday, hasLiveMeditationToday]);

    const handleMenuItemClick = useCallback((item: { path?: string | null; comingSoon?: boolean }) => {
        triggerHaptic('light');
        if (item.path) { 
            navigate(item.path); 
            onClose(); 
        } else if (item.comingSoon) { 
            showToast('Coming soon'); 
        }
    }, [navigate, onClose, showToast]);

    const capitalizedDisplayName = useMemo(() => 
        displayName.replace(/^./, c => c.toUpperCase()),
        [displayName]
    );

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop - Optimized with will-change */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={backdropTransition}
                        className="fixed inset-0 z-[10000] bg-brand-dark/60 backdrop-blur-sm"
                        onClick={handleBackdropClick}
                        style={{ 
                            touchAction: 'none',
                            willChange: 'opacity'
                        }}
                    />
                    
                    {/* Drawer Content - Hardware accelerated with transform3d */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={drawerTransition}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.2, right: 0.05 }}
                        dragMomentum={false}
                        onDragEnd={handleDragEnd}
                        className="fixed inset-y-0 left-0 z-[10100] w-[85%] max-w-[320px] h-full flex flex-col shadow-2xl text-white overflow-hidden bg-[#0f2735] rounded-r-3xl border-r border-white/10"
                        style={{
                            willChange: 'transform',
                            transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                        }}
                    >
                {/* Solid blue base for readability + subtle glass sheen */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f2f3c] via-[#16536a] to-[#0f2735]" aria-hidden />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" aria-hidden />
                
                {/* OM symbol — subtle luxury accent */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20" aria-hidden>
                    <span className="font-serif text-[180px] leading-none text-[#D4A574]/10 select-none" style={{ fontFamily: 'Cormorant Garamond, ui-serif, serif' }}>ॐ</span>
                </div>
                
                {/* Subtle golden geometry — mandala-inspired */}
                <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] pointer-events-none opacity-[0.045]" viewBox="0 0 100 100" aria-hidden>
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#D4A574" strokeWidth="0.4" />
                    <circle cx="50" cy="50" r="36" fill="none" stroke="#D4A574" strokeWidth="0.35" opacity="0.8" />
                    <circle cx="50" cy="50" r="24" fill="none" stroke="#D4A574" strokeWidth="0.3" opacity="0.6" />
                    {[...Array(8)].map((_, i) => {
                        const a = (i * Math.PI * 2) / 8;
                        const x1 = 50 + 48 * Math.cos(a);
                        const y1 = 50 + 48 * Math.sin(a);
                        return <line key={i} x1="50" y1="50" x2={x1} y2={y1} stroke="#D4A574" strokeWidth="0.25" opacity="0.5" />;
                    })}
                </svg>

                {/* Golden dust — varied sizes, opacities, twinkle */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                    {[
                        [8,12],[18,8],[92,15],[78,22],[35,35],[62,42],[15,58],[88,65],[22,82],[72,78],
                        [48,25],[95,48],[5,45],[55,88],[28,18],[82,38],[12,72],[68,12],[42,55],[85,92],
                    ].map(([x,y], i) => {
                        const size = i % 3 === 0 ? 'w-0.5 h-0.5' : i % 3 === 1 ? 'w-1 h-1' : 'w-1.5 h-1.5';
                        const opacity = i % 4 === 0 ? 'bg-[#D4A574]/30' : i % 4 === 1 ? 'bg-[#D4A574]/50' : i % 4 === 2 ? 'bg-[#D4A574]/40' : 'bg-[#E6C27A]/45';
                        return (
                            <div key={i} className={`absolute ${size} rounded-full ${opacity} animate-twinkle`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.25) % 4}s` }} />
                        );
                    })}
                    {/* Soft glow clusters */}
                    <div className="absolute left-1/4 top-1/3 w-20 h-20 rounded-full bg-[#D4A574]/[0.08] blur-2xl" />
                    <div className="absolute right-1/4 top-2/3 w-16 h-16 rounded-full bg-[#E6C27A]/[0.06] blur-xl" />
                    <div className="absolute left-1/2 top-1/4 w-12 h-12 rounded-full bg-[#D4A574]/[0.05] blur-lg" />
                </div>
                
                {/* Creative accent: warm gradient glow along right edge */}
                <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-l from-[#D4A574]/40 via-[#D4A574]/15 to-transparent pointer-events-none" aria-hidden />
                
                {/* Single unified scrollable container — above ripples for crisp text */}
                <div 
                    className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden min-h-0 pt-safe pb-safe" 
                    style={{ 
                        WebkitOverflowScrolling: 'touch',
                        willChange: 'scroll-position',
                        transform: 'translateZ(0)', // Force GPU acceleration for scrolling
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    
                    {/* Content wrapper */}
                    <div className="px-6 sm:px-8 pb-10 pt-10">
                        <div className="flex items-start gap-4 mb-8">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4A574] to-[#8A6236] text-white flex items-center justify-center font-bold text-2xl border-2 border-white/20 shadow-lg shadow-black/20 shrink-0">
                                {getUserInitials(displayName)}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col items-start gap-1 pt-1">
                                <h3 className="text-white font-bold text-xl leading-tight truncate w-full font-serif">
                                    {capitalizedDisplayName}
                                </h3>
                                <p className="text-brand-light/60 text-[13px] truncate w-full font-medium">{userDisplayEmail || 'Loading...'}</p>
                                {isMembershipLoading ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 mt-1">
                                        <span className="text-white/40 font-bold text-[10px] tracking-wider uppercase animate-pulse">Loading membership...</span>
                                    </span>
                                ) : isPremium ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4A574]/25 border border-[#D4A574]/50 mt-1">
                                        <Crown size={10} className="text-[#D4A574]" />
                                        <span className="text-[#D4A574] font-bold text-[10px] tracking-wider uppercase">Premium Member</span>
                                    </span>
                                ) : (
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/20">
                                            <span className="text-white/40 font-bold text-[10px] tracking-wider uppercase">Free Plan</span>
                                        </span>
                                        <button
                                            onClick={() => { triggerHaptic('light'); navigate('/subscription'); onClose(); }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4A574]/20 border border-[#D4A574]/40 hover:bg-[#D4A574]/30 transition-colors active:scale-95"
                                        >
                                            <Sparkles size={9} className="text-[#D4A574]" />
                                            <span className="text-[#D4A574] font-bold text-[10px] tracking-wider uppercase">Upgrade</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Decorative breath divider */}
                        <div className="flex items-center gap-3 mb-8 opacity-80">
                            <div className="relative flex-1 h-px bg-gradient-to-r from-transparent via-[#D4A574]/40 to-[#D4A574]/40 overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-left" />
                            </div>
                            <div className="flex gap-1.5 items-center justify-center">
                                <span className="w-1 h-1 rounded-full bg-[#D4A574]/50" />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A574] shadow-[0_0_6px_rgba(212,165,116,0.5)] logo-dot-breathe" />
                                <span className="w-1 h-1 rounded-full bg-[#D4A574]/50" />
                            </div>
                            <div className="relative flex-1 h-px bg-gradient-to-l from-transparent via-[#D4A574]/40 to-[#D4A574]/40 overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-right" style={{ animationDelay: '4.5s' }} />
                            </div>
                        </div>

                        <nav className="space-y-8">
                        {menuSections.map((block, blockIdx) => (
                                <div key={blockIdx} className="space-y-3">
                                    {block.section ? <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#D4A574]/80 mb-4 px-2">{block.section}</p> : null}
                                    <div className="space-y-0.5">
                                        {block.items.map((item, idx) => {
                                            const isComingSoon = (item as { comingSoon?: boolean }).comingSoon;
                                            const useOnlineIcon = (item as { useOnlineIcon?: boolean }).useOnlineIcon;
                                            const showCompletion = (item as { showCompletion?: boolean }).showCompletion;
                                            const IconComponent = (item as { icon?: React.ComponentType<{ size?: number; className?: string }> }).icon;
                                            return (
                                            <button
                                                key={idx}
                                                onClick={() => handleMenuItemClick(item)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-left group active:scale-[0.98] border border-transparent ${
                                                    isComingSoon 
                                                        ? 'cursor-pointer hover:bg-white/5 opacity-70' 
                                                        : 'hover:bg-white/10 hover:border-white/5 hover:shadow-lg hover:shadow-black/10'
                                                }`}
                                            >
                                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                    {useOnlineIcon ? (
                                                        <div className="relative">
                                                            <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#D4A574] z-10 relative" />
                                                            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                                                        </div>
                                                    ) : IconComponent ? (
                                                        <IconComponent 
                                                            size={22} 
                                                            className={`transition-colors duration-300 ${
                                                                isComingSoon 
                                                                    ? 'text-[#D4A574]/60' 
                                                                    : 'text-[#D4A574] group-hover:text-[#F6D894] group-hover:drop-shadow-[0_0_8px_rgba(212,165,116,0.5)]'
                                                            }`} 
                                                            strokeWidth={1.8}
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0 leading-tight">
                                                    <span className={`font-medium text-[16px] tracking-wide text-white/90 group-hover:text-white transition-colors`}>{item.label}</span>
                                                    {isComingSoon && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4A574]/70 leading-tight">Coming Soon</span>
                                                    )}
                                                </div>
                                                {showCompletion ? (
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                        item.completed
                                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                                            : 'border border-white/10 bg-white/5'
                                                    }`}>
                                                        {item.completed ? (
                                                            <CheckCircle2 size={14} className="text-emerald-400" />
                                                        ) : null}
                                                    </div>
                                                ) : item.completed ? (
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                                    </div>
                                                ) : null}
                                                {item.streak !== undefined && item.streak > 0 && (
                                                    <span className="text-[11px] font-bold text-[#D4A574] shrink-0 bg-[#D4A574]/10 px-2 py-0.5 rounded-full">{item.streak}d</span>
                                                )}
                                            </button>
                                        );})}
                                    </div>
                                    {blockIdx < menuSections.length - 1 && (
                                        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    )}
                                </div>
                            ))}
                            
                            {/* Dark Mode toggle row */}
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl">
                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                    {theme === 'dark' ? (
                                        <Moon size={22} className="text-[#D4A574]" strokeWidth={1.8} />
                                    ) : (
                                        <Sun size={22} className="text-[#D4A574]" strokeWidth={1.8} />
                                    )}
                                </div>
                                <span className="flex-1 font-medium text-[16px] tracking-wide text-white/90">Dark Mode</span>
                                <button
                                    onClick={() => { triggerHaptic('light'); toggleTheme(); }}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:ring-offset-2 focus:ring-offset-transparent active:scale-[0.98] ${
                                        theme === 'dark' ? 'bg-[#D4A574]/40' : 'bg-white/20'
                                    }`}
                                    role="switch"
                                    aria-checked={theme === 'dark'}
                                    aria-label="Toggle dark mode"
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                                            theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                            
                            <div className="pt-0.5">
                                <button
                                    onClick={() => { 
                                        triggerHaptic('medium');
                                        setActiveOverlay('LOGOUT'); 
                                        onClose(); 
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-white/10 hover:border hover:border-white/5 hover:shadow-lg transition-all text-left active:scale-[0.98] group"
                                >
                                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                        <LogOut size={22} className="text-[#D4A574] group-hover:text-red-400 transition-colors" strokeWidth={1.8} />
                                    </div>
                                    <span className="font-medium text-[16px] tracking-wide text-white/90 group-hover:text-red-200 transition-colors">Logout</span>
                                </button>
                            </div>
                        </nav>

                        {/* Footer buttons - Share and Support (theme moved to Dark Mode row) */}
                        <div className="pt-8 pb-4 flex items-center justify-center gap-6 mt-auto">
                            <button 
                                onClick={() => {
                                    const appStoreUrl = 'https://apps.apple.com/us/app/the-school-of-breath/id6736984340';
                                    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.meditatewithabhi.theschoolofbreath';
                                    const message = `Hey there! 🎉 I just discovered this amazing app, and I think you'd love it too! Download it now — tap to get started:\n\n📱 iPhone: ${appStoreUrl}\n\n📱 Android: ${playStoreUrl}`;
                                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                                }} 
                                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/80 flex items-center justify-center shadow-lg hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
                                aria-label="Share App"
                            >
                                <Share2 size={20} strokeWidth={1.5} />
                            </button>
                            
                            <button 
                                onClick={() => window.open('https://wa.me/919253392845', '_blank')} 
                                className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg hover:bg-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
                                aria-label="Support Chat"
                            >
                                <MessageCircle size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                        
                        <p className="text-center text-[10px] text-white/30 tracking-widest uppercase mt-4 font-medium">
                            Version 3.0.0
                        </p>
                    </div>
                </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

