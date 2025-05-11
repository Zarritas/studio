
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { auth, googleProvider } from '@/lib/firebase/client';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'tabwise_firebase_auth_token'; // Updated key name for clarity

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          localStorage.setItem(AUTH_KEY, token);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error getting ID token:", error);
          localStorage.removeItem(AUTH_KEY);
          setIsAuthenticated(false);
          setCurrentUser(null); 
        }
      } else {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting isAuthenticated, currentUser, and token
      // It will also trigger the useEffect below to navigate if necessary
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      toast({
        title: t('signInErrorTitle', {defaultValue: "Sign-In Error"}),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
        // setIsLoading(false); // onAuthStateChanged will set isLoading to false
    }
  }, [t, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting isAuthenticated to false and clearing user data
    } catch (error) {
      console.error("Error signing out:", error);
       toast({
        title: t('signOutErrorTitle', {defaultValue: "Sign-Out Error"}),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
        // setIsLoading(false); // onAuthStateChanged will set isLoading to false
    }
  }, [t, toast]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && pathname === '/login') {
        router.push('/dashboard');
      } else if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);


  if (isLoading && pathname !== '/login') {
     // Use a generic loading message or a specific one from translations
    return <div className="flex items-center justify-center min-h-screen">{t('loading', {defaultValue: 'Loading...'})}</div>;
  }
  
  // Allow access to /login page even if loading or not authenticated
  if (pathname === '/login') {
    return <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, isLoading }}>{children}</AuthContext.Provider>;
  }

  // If still loading but not on /login, show loading (already handled above)
  // If not loading, not authenticated, and not on /login, redirect (handled by useEffect)
  // This specific check might be redundant due to the useEffect but can act as a safeguard.
  if (!isLoading && !isAuthenticated && pathname !== '/login') {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
