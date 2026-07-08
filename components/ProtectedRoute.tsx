import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getAuthCache } from '../services/authService';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const cached = getAuthCache();
  const [isAuth, setIsAuth] = useState<boolean | null>(() => cached);
  const [isLoading, setIsLoading] = useState(() => cached === null);

  useEffect(() => {
    if (cached !== null) {
      setIsAuth(cached);
      setIsLoading(false);
      return;
    }
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        setIsAuth(authenticated);
      } catch (error) {
        console.error('[ProtectedRoute] Error checking authentication', error);
        setIsAuth(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [cached]);

  // Show loading state only when auth has never been checked (first app load)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f2f3c] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto mb-4" />
          <p className="text-white/70 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};

