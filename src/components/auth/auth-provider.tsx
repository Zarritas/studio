"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

  useEffect(() => {
    try {
      const token = localStorage.getItem(AUTH_KEY);
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      // localStorage might not be available (e.g. SSR, or disabled by user)
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
     // Basic loading state to prevent flicker, could be a spinner component
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Allow access to login page even while loading or not authenticated
  if (pathname === '/login' && !isAuthenticated) {
    return <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>{children}</AuthContext.Provider>;
  }

  // If loading is done and user is not authenticated, and not on login page, they will be redirected by the effect above.
  // This prevents rendering protected content before redirection.
  if (!isLoading && !isAuthenticated && pathname !== '/login') {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
