import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, CreditCard, Lock, Bell, Trash2, X, AlertTriangle, 
  CheckCircle2, Shield, Info, FileText, BarChart3
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { getStoredAuth } from '../services/authService';
import { deleteAccount } from '../services/accountDeletionService';
import { getDetailedSubscriptionInfo, openSubscriptionManagement } from '../services/revenuecatService';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isSubscribed } = useApp();
  const [deleteStep, setDeleteStep] = useState<'subscription' | 'initial' | 'final' | 'success' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [canChangePassword, setCanChangePassword] = useState(true);

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

  React.useEffect(() => {
    const loadUserEmail = async () => {
      const auth = await getStoredAuth();
      setUserEmail(auth?.email || '');
      const hasSocial = Boolean(auth?.social && Object.keys(auth.social).length > 0) || isSocialFromToken(auth?.token);
      setCanChangePassword(!hasSocial);
    };
    loadUserEmail();
  }, []);

  const hasActiveSubscription = async (): Promise<boolean> => {
    if (isSubscribed) return true;
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const details = await getDetailedSubscriptionInfo();
      return details.hasEntitlement;
    } catch (error) {
      console.warn('[Settings] Subscription check failed', error);
      return false;
    }
  };

  const handleStartDeleteFlow = async () => {
    const isActive = await hasActiveSubscription();
    if (isActive) {
      setDeleteStep('subscription');
      return;
    }
    setDeleteStep('initial');
  };

  const handleOpenSubscriptionManagement = async () => {
    const opened = await openSubscriptionManagement();
    if (!opened) {
      navigate('/subscription');
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      setDeleteStep('success');
    } catch (error) {
      console.error('Account deletion failed:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setDeleteStep(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 px-6 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <BackButton
            variant="dark"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-serif font-bold">Settings</h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-6 space-y-4">
        {/* My Progress */}
        <button
          onClick={() => navigate('/progress')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <BarChart3 size={20} className="text-[#D4A574]" />
          <div className="font-medium text-sm tracking-wide">My Progress</div>
        </button>

        {/* Manage Membership */}
        <button
          onClick={() => navigate('/subscription')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <CreditCard size={20} className="text-[#D4A574]" />
          <div className="flex-1">
            <div className="font-medium text-sm tracking-wide">Manage Membership</div>
            {isSubscribed && (
              <p className="text-[9px] text-[#D4A574]/60 font-bold uppercase tracking-widest mt-0.5">
                Premium Active
              </p>
            )}
          </div>
        </button>

        {/* Change Password */}
        {canChangePassword && (
          <button
            onClick={() => navigate('/change-password')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
          >
            <Lock size={20} className="text-[#D4A574]" />
            <div className="font-medium text-sm tracking-wide">Change Password</div>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={() => navigate('/notification-settings')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <Bell size={20} className="text-[#D4A574]" />
          <div className="font-medium text-sm tracking-wide">Notifications</div>
        </button>

        {/* Terms of Services */}
        <button
          onClick={() => navigate('/terms-of-services')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <FileText size={20} className="text-[#D4A574]" />
          <div className="font-medium text-sm tracking-wide">Terms of Services</div>
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => navigate('/privacy-policy')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <Shield size={20} className="text-[#D4A574]" />
          <div className="font-medium text-sm tracking-wide">Privacy Policy</div>
        </button>

        {/* About Us */}
        <button
          onClick={() => navigate('/about-us')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left active:scale-95"
        >
          <Info size={20} className="text-[#D4A574]" />
          <div className="font-medium text-sm tracking-wide">About Us</div>
        </button>

        {/* Divider */}
        <div className="h-px bg-white/10 my-4" />

        {/* Delete Account */}
        <button
          onClick={handleStartDeleteFlow}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-all text-left active:scale-95 border border-red-500/20"
        >
          <Trash2 size={20} className="text-red-400" />
          <div className="font-medium text-sm tracking-wide text-red-400">Delete Account</div>
        </button>
      </div>

      {/* Delete Account Modal - Subscription Active */}
      {deleteStep === 'subscription' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0f172a] rounded-3xl p-6 max-w-md w-full border border-yellow-500/30 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-yellow-400" />
              <h2 className="text-xl font-serif font-bold">Cancel Subscription First</h2>
            </div>

            <p className="text-white/80 mb-6 leading-relaxed">
              You have an active subscription. Please cancel it first, then wait a few minutes before deleting your account.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-medium"
              >
                Close
              </button>
              <button
                onClick={handleOpenSubscriptionManagement}
                className="flex-1 px-4 py-3 rounded-xl bg-yellow-500/90 hover:bg-yellow-500 transition-all font-medium"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal - Step 1: Initial Warning */}
      {deleteStep === 'initial' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0f172a] rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h2 className="text-xl font-serif font-bold">Delete Account</h2>
            </div>
            
            <p className="text-white/80 mb-6 leading-relaxed">
              This will permanently delete:
            </p>
            
            <ul className="space-y-2 mb-6 text-white/70 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Your account and profile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>All breathing session history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Journal entries (Gratitude & Intention)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Progress data and statistics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Premium membership access</span>
              </li>
            </ul>

            <p className="text-red-400 text-sm font-medium mb-6">
              ⚠️ This action cannot be undone.
            </p>

            {isSubscribed && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-6">
                <p className="text-yellow-400 text-xs leading-relaxed">
                  <strong>Note:</strong> If you have an active subscription, please cancel it first in [App Store/Google Play] to avoid future charges.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep('final')}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all font-medium"
              >
                Continue to Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal - Step 3: Final Warning */}
      {deleteStep === 'final' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0f172a] rounded-3xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h2 className="text-xl font-serif font-bold text-red-400">🚨 FINAL WARNING</h2>
            </div>
            
            <p className="text-white/90 mb-6 leading-relaxed font-medium">
              This is your last chance.
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-white/90 text-sm leading-relaxed">
                Your account <strong className="text-red-400">"{userEmail}"</strong> and all associated data will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep('initial')}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-medium"
              >
                Go Back
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal - Step 4: Success */}
      {deleteStep === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="bg-[#0f172a] rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 size={48} className="text-green-400" />
            </div>
            
            <h2 className="text-xl font-serif font-bold text-center mb-4">
              ✓ Account Deletion Initiated
            </h2>
            
            <p className="text-white/80 mb-6 leading-relaxed text-center">
              Your account deletion request has been received.
            </p>

            <ul className="space-y-2 mb-6 text-white/70 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Your account deletion request has been received</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>You'll receive a confirmation email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Active subscriptions must be canceled separately</span>
              </li>
            </ul>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6">
              <p className="text-blue-400 text-xs leading-relaxed">
                If you change your mind, contact <strong>support@schoolofbreath.com</strong> within 7 days.
              </p>
            </div>

            <button
              onClick={() => {
                navigate('/login');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#D4A574] hover:bg-[#C49A64] transition-all font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
