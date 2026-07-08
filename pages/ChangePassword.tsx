import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Eye, EyeOff, Lock, CheckCircle2, 
    AlertCircle, ShieldCheck, HelpCircle, Loader2
} from 'lucide-react';
import { changePassword, getStoredAuth, logout } from '../services/authService';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocialAccount, setIsSocialAccount] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  const isSocialFromToken = (token?: string): boolean => {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length < 2) return false;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
      const payload = JSON.parse(atob(padded));
      const loginType = typeof payload.loginType === 'string' ? payload.loginType : typeof payload.provider === 'string' ? payload.provider : '';
      return ['google', 'apple', 'facebook', 'social'].includes(loginType);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const loadAccountType = async () => {
      try {
        const auth = await getStoredAuth();
        const hasSocial = Boolean(auth?.social && Object.keys(auth.social).length > 0) || isSocialFromToken(auth?.token);
        setIsSocialAccount(hasSocial);
      } finally {
        setIsLoadingAccount(false);
      }
    };

    loadAccountType();
  }, []);

  useEffect(() => {
    if (!isLoadingAccount && isSocialAccount) {
      navigate('/settings', { replace: true });
    }
  }, [isLoadingAccount, isSocialAccount, navigate]);

  // Validations
  const isMinLength = useMemo(() => newPassword.length >= 6, [newPassword]);
  const isMatching = useMemo(() => newPassword === confirmPassword && confirmPassword !== '', [newPassword, confirmPassword]);
  const isValid = useMemo(
    () => isMinLength && isMatching && currentPassword !== '' && !isSocialAccount && !isLoadingAccount,
    [isMinLength, isMatching, currentPassword, isSocialAccount, isLoadingAccount]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(async () => {
        await logout();
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password change failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase pb-28 transition-colors duration-300">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-3 font-bold border border-white/20">
          <CheckCircle2 size={24} />
          <span>Password updated successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 pt-12 flex items-center gap-4 bg-white/80 dark:bg-brand-darkSurface/80 backdrop-blur-xl border-b border-brand-light dark:border-brand-darkBorder sticky top-0 z-30">
        <button 
          onClick={() => navigate('/')} 
          className="relative p-3 bg-white/80 dark:bg-white/10 rounded-full hover:bg-white dark:hover:bg-white/20 transition-all duration-300 border-2 border-brand-gold/30 dark:border-brand-gold/20 shadow-lg shadow-brand-gold/10 dark:shadow-brand-gold/5 active:scale-95 group"
          aria-label="Go back"
          style={{
            boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <ArrowLeft size={20} className="relative z-10 text-brand-dark dark:text-white group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-xl font-serif font-bold text-brand-dark dark:text-brand-darkText">Security</h1>
          <p className="text-[10px] text-brand-medium dark:text-brand-darkTextMuted font-bold uppercase tracking-widest">Update Credentials</p>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto animate-fade-in">
        <div className="mb-10 text-center space-y-3">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto text-brand-primary dark:text-brand-gold">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold dark:text-white">Change Password</h2>
          <p className="text-brand-medium dark:text-brand-darkTextMuted text-sm leading-relaxed">
            Ensure your account stays secure by using a strong, unique password.
          </p>
        </div>

        {isSocialAccount && !isLoadingAccount && (
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
            <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 leading-relaxed">
              Password changes are only available for email/password accounts. Please use your social provider to manage access.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-medium dark:text-brand-darkTextMuted uppercase tracking-widest ml-1" htmlFor="current">
              Current Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-medium/40">
                <Lock size={18} />
              </div>
              <input 
                id="current"
                type={showCurrent ? 'text' : 'password'} 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-white dark:bg-brand-darkSurface border border-brand-light dark:border-brand-darkBorder rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white transition-all shadow-sm"
                placeholder="••••••••"
                required
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              />
              <button 
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-medium/40 hover:text-brand-primary transition-colors"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="h-px bg-brand-light dark:bg-brand-darkBorder my-2 mx-4" />

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-medium dark:text-brand-darkTextMuted uppercase tracking-widest ml-1" htmlFor="new">
              New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-medium/40">
                <Lock size={18} />
              </div>
              <input 
                id="new"
                type={showNew ? 'text' : 'password'} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full bg-white dark:bg-brand-darkSurface border rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white transition-all shadow-sm ${newPassword !== '' && !isMinLength ? 'border-red-300' : 'border-brand-light dark:border-brand-darkBorder'}`}
                placeholder="Min. 6 characters"
                required
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              />
              <button 
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-medium/40 hover:text-brand-primary transition-colors"
                aria-label={showNew ? "Hide new password" : "Show new password"}
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPassword !== '' && !isMinLength && (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 ml-1">
                <AlertCircle size={10} /> Must be at least 6 characters
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-medium dark:text-brand-darkTextMuted uppercase tracking-widest ml-1" htmlFor="confirm">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-medium/40">
                <Lock size={18} />
              </div>
              <input 
                id="confirm"
                type={showConfirm ? 'text' : 'password'} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full bg-white dark:bg-brand-darkSurface border rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white transition-all shadow-sm ${confirmPassword !== '' && !isMatching ? 'border-red-300' : 'border-brand-light dark:border-brand-darkBorder'}`}
                placeholder="Repeat new password"
                required
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              />
              <button 
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-medium/40 hover:text-brand-primary transition-colors"
                aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
                disabled={isSocialAccount || isLoadingAccount || isSubmitting}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword !== '' && !isMatching && (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 ml-1">
                <AlertCircle size={10} /> Passwords do not match
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={!isValid || isSubmitting || isLoadingAccount}
            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${!isValid || isSubmitting || isLoadingAccount ? 'bg-brand-light dark:bg-white/5 text-brand-medium/30 cursor-not-allowed shadow-none' : 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark hover:bg-brand-primary dark:hover:bg-brand-gold/80'}`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Processing...</>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-6">
          <button 
            onClick={() => navigate('/chat?q=forgot+password')}
            className="text-xs font-bold text-brand-primary dark:text-brand-gold uppercase tracking-widest hover:underline flex items-center gap-2"
          >
            <HelpCircle size={14} /> Forgot Password?
          </button>
          
          <p className="text-[10px] text-center text-brand-medium/40 leading-relaxed max-w-xs uppercase font-bold tracking-wider">
            You will be required to log in again after changing your password for your security.
          </p>
        </div>
      </div>
    </div>
  );
};
