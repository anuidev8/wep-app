import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated, loginWithSocial } from '../services/authService';
import {
  signInWithProvider,
  isAppleSignInSupported,
  SOCIAL_LOGIN_CANCELLED,
  SocialLoginCancelledError,
} from '../services/socialLoginService';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '../services/rememberUserService';
import { Wind, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialSubmittingProvider, setSocialSubmittingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('[Login] Error checking authentication', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadRememberedEmail = async () => {
      const rememberedEmail = await getRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    };

    loadRememberedEmail().catch((e) => {
      console.error('[Login] Failed to load remembered email', e);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);

      if (rememberMe) {
        await setRememberedEmail(result.email);
      } else {
        await clearRememberedEmail();
      }
      
      // Login successful - token is already stored by authService
      // Redirect to home page
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setSocialSubmittingProvider(provider);
    try {
      const { token } = await signInWithProvider(provider);
      console.log('Social login: token', token);
      const result = await loginWithSocial(provider, token);
      if (rememberMe) {
        await setRememberedEmail(result.email);
      } else {
        await clearRememberedEmail();
      }
      navigate('/');
    } catch (err) {
      if (err instanceof SocialLoginCancelledError || (err instanceof Error && err.message === SOCIAL_LOGIN_CANCELLED)) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Social login failed. Please try again.');
    } finally {
      setSocialSubmittingProvider(null);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary dark:text-brand-gold mx-auto mb-4" />
          <p className="text-brand-medium dark:text-brand-darkTextMuted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#1E4650' }}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E4650] via-[#1E4650] to-[#163a43]"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 dark:bg-brand-darkSurface/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-brand-light/50 dark:border-brand-darkBorder/50 p-8 md:p-10 transition-colors duration-300">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-dark dark:from-brand-gold dark:to-brand-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Wind size={32} className="text-white dark:text-brand-dark" />
            </div>
          </div>

          {/* Brand line */}
          <p className="text-center mb-2">
            <span className="font-serif font-semibold text-lg md:text-xl tracking-wide text-brand-primary dark:text-brand-primary/95">School</span>
            <span className="font-serif font-semibold text-lg md:text-xl tracking-wide text-brand-medium/80 dark:text-brand-darkTextMuted/90"> of </span>
            <span className="font-serif font-semibold text-lg md:text-xl tracking-wide text-brand-gold dark:text-brand-gold">Breath</span>
          </p>
          {/* Title */}
          <h1 className="text-lg md:text-xl font-serif font-bold text-center text-brand-dark dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-brand-medium/70 dark:text-brand-darkTextMuted/70 mb-6 text-sm">
            Sign in to continue your breathwork journey
          </p>

          {/* Google Sign-in Button - Prioritized at Top */}
          <div className="mb-6">
            <GoogleSignInButton
              onClick={() => handleSocialLogin('google')}
              disabled={isSubmitting || socialSubmittingProvider !== null}
              isLoading={socialSubmittingProvider === 'google'}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-brand-light/60 dark:bg-brand-darkBorder/60" />
            <span className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted/60">or continue with email</span>
            <span className="h-px flex-1 bg-brand-light/60 dark:bg-brand-darkBorder/60" />
          </div>

          {/* Error Message - Only show when there's an actual error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-brand-dark dark:text-brand-darkTextMuted mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase text-brand-dark dark:text-white placeholder-brand-medium/50 dark:placeholder-brand-darkTextMuted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-gold focus:border-transparent transition-all"
                placeholder="your@email.com"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-brand-dark dark:text-brand-darkTextMuted mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase text-brand-dark dark:text-white placeholder-brand-medium/50 dark:placeholder-brand-darkTextMuted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-gold focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-medium dark:text-brand-darkTextMuted hover:text-brand-dark dark:hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 text-sm text-brand-medium/80 dark:text-brand-darkTextMuted/80">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-brand-light dark:border-brand-darkBorder text-brand-primary focus:ring-brand-primary"
                disabled={isSubmitting || socialSubmittingProvider !== null}
              />
              Remember me
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-dark dark:from-brand-gold dark:to-brand-primary text-white dark:text-brand-dark font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Apple Sign-in (if supported) - Below email form */}
          {isAppleSignInSupported() && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={isSubmitting || socialSubmittingProvider !== null}
                className="w-full py-3 rounded-xl border border-brand-light dark:border-brand-darkBorder bg-white/80 dark:bg-brand-darkBase/80 text-brand-dark dark:text-white font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {socialSubmittingProvider === 'apple' ? (
                  <>
                    <Loader2 size={20} className="animate-spin shrink-0" />
                    <span>Signing in with Apple...</span>
                  </>
                ) : (
                  'Sign in with Apple'
                )}
              </button>
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted/60">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-brand-primary dark:text-brand-gold font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
            <p className="mt-3 text-[11px] text-brand-medium/60 dark:text-brand-darkTextMuted/60">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => navigate('/privacy-policy')}
                className="text-brand-primary dark:text-brand-gold font-semibold hover:underline"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
