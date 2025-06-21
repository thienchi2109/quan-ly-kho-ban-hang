
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// NOTE: This is a simplified auth system for demonstration as requested.
// Storing plaintext passwords is a major security risk.
// In a real application, ALWAYS use a secure authentication service like Firebase Authentication.

interface SimpleUser {
  email: string;
}

interface AuthContextType {
  currentUser: SimpleUser | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'app-user-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SimpleUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for a session on initial load
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        setCurrentUser(JSON.parse(sessionData));
      }
    } catch (error) {
      console.error("Failed to parse user session from sessionStorage", error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setLoadingAuth(false);
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoadingAuth(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password === pass) {
        const userToStore: SimpleUser = { email: userData.email };
        setCurrentUser(userToStore);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userToStore));
        return { success: true };
      } else {
        return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
      }
    } catch (error) {
      console.error("Custom login error:", error);
      return { success: false, error: 'Đã xảy ra lỗi trong quá trình đăng nhập.' };
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    router.push('/login');
  };

  const value: AuthContextType = {
    currentUser,
    loadingAuth,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
