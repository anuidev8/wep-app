import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind, Eye, EyeOff, Loader2 } from 'lucide-react';
import { register } from '../services/authService';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password) {
      setError('Please enter your name, email, and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-light/20 dark:from-brand-dark/30 via-transparent to-brand-primary/10 dark:to-brand-darkSurface/20"></div>

      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-gold/5 dark:bg-brand-gold/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 dark:bg-brand-darkSurface/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-brand-light/50 dark:border-brand-darkBorder/50 p-8 md:p-10 transition-colors duration-300">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-dark dark:from-brand-gold dark:to-brand-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Wind size={32} className="text-white dark:text-brand-dark" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-serif font-bold text-center text-brand-dark dark:text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-center text-brand-medium/70 dark:text-brand-darkTextMuted/70 mb-6 text-sm">
            Start your breathwork journey in minutes
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-brand-dark dark:text-brand-darkTextMuted mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase text-brand-dark dark:text-white placeholder-brand-medium/50 dark:placeholder-brand-darkTextMuted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-gold focus:border-transparent transition-all"
                placeholder="Your name"
                disabled={isSubmitting}
                required
              />
            </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-brand-dark dark:text-brand-darkTextMuted mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase text-brand-dark dark:text-white placeholder-brand-medium/50 dark:placeholder-brand-darkTextMuted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-gold focus:border-transparent transition-all"
                  placeholder="Create a password"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-dark dark:from-brand-gold dark:to-brand-primary text-white dark:text-brand-dark font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted/60">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-brand-primary dark:text-brand-gold font-semibold hover:underline"
              >
                Sign in
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
