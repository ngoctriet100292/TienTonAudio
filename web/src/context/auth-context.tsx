'use client';

import { CultivationProvider } from './cultivation-context';
import { api } from '@/lib/api';
import { User } from '@/types';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.getMe();
      if (me) {
        setUser(me ? me : null);
        localStorage.setItem('user_profile', JSON.stringify(me));
      } else {
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
      }
    } catch {
      // Preserve the session when the server or connection is temporarily unavailable.
    }
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_profile', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) void api.logout(refreshToken).catch(() => { });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;
    api.getMe().then((me) => {
      if (cancelled) return;
      setUser(me ? me : null);
      if (me) localStorage.setItem('user_profile', JSON.stringify(me));
    }).catch(() => {
      const stored = localStorage.getItem('user_profile');
      if (!cancelled && stored) {
        try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('user_profile'); }
      }
    }).finally(() => { if (!cancelled) setIsLoading(false); });
    const onSessionChange = () => { if (!localStorage.getItem('access_token')) setUser(null); };
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('tienton-session-change', onSessionChange);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onSessionChange);
      window.removeEventListener('tienton-session-change', onSessionChange);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      <CultivationProvider>{children}</CultivationProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
