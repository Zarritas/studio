
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n'; // Assuming useTranslation can be used here or pass t function

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'tabwise_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  // Note: Using useTranslation directly here might cause issues if LocaleProvider is a child of AuthProvider.
  // For simplicity, we'll use a hardcoded string or assume t is available if LocaleProvider wraps AuthProvider.
  // If LocaleProvider is a child, this t() call won't work as expected during initial load.
  // A more robust solution might involve passing `t` or having a global `t` instance.
  // For this iteration, let's assume t works or use a default string.
  const { t } = useTranslation(); 


  useEffect(() => {
    try {
      const token = localStorage.getItem(AUTH_KEY);
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.warn("Could not access localStorage for authentication state:", error);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string = 'mock_token') => {
    try {
      localStorage.setItem(AUTH_KEY, token);
    } catch (error) {
      console.warn("Could not set auth token in localStorage:", error);
    }
    setIsAuthenticated(true);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (error) {
      console.warn("Could not remove auth token from localStorage:", error);
    }
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);


  if (isLoading && pathname !== '/login') {
    return <div className="flex items-center justify-center min-h-screen">{t('loading', {defaultValue: 'Loading...'})}</div>;
  }
  
  if (pathname === '/login' && !isAuthenticated) {
    return <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>{children}</AuthContext.Provider>;
  }

  if (!isLoading && !isAuthenticated && pathname !== '/login') {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
