
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<UserCredential | string>;
  signInWithGoogle: () => Promise<UserCredential | string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const auth = getAuth(app);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, pass: string): Promise<UserCredential | string> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential;
    } catch (error: any) {
      console.error("Login error in AuthContext:", error);
      return error.code || error.message || "Lỗi đăng nhập không xác định";
    }
  };

  const signInWithGoogle = async (): Promise<UserCredential | string> => {
    console.log("Attempting Google Sign-In...");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Google Sign-In successful:", result.user?.displayName);
      return result;
    } catch (error: any) {
      console.error("Detailed Google Sign-In error object in AuthContext:", error);
      console.error("Google Sign-In error code:", error.code);
      console.error("Google Sign-In error message:", error.message);
      // 'auth/account-exists-with-different-credential' là một lỗi thường gặp
      // 'auth/auth-domain-config-required'
      // 'auth/cancelled-popup-request'
      // 'auth/operation-not-allowed' - Google Sign-in not enabled in Firebase console.
      // 'auth/operation-not-supported-in-this-environment'
      // 'auth/popup-blocked'
      // 'auth/popup-closed-by-user'
      // 'auth/unauthorized-domain' - Domain not authorized in Firebase console.
      return error.code || error.message || "Lỗi đăng nhập Google không xác định";
    }
  };

  const logout = async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    currentUser,
    loadingAuth,
    login,
    signInWithGoogle,
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
