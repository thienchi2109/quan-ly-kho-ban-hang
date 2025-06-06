
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation'; // Corrected import

interface AuthContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<UserCredential | string>;
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
      console.error("Login error:", error);
      return error.code || error.message || "Failed to login"; // Return Firebase error code or message
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      // It's often better to handle navigation in the component calling logout
      // or via useEffect watching currentUser in a layout component.
      // Forcing a redirect here can sometimes be too aggressive.
      // router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      // You might want to show a toast message for logout errors
    }
  };

  const value = {
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
