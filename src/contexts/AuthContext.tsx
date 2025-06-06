
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
    // setLoadingAuth(true); // loadingAuth is primarily for initial auth state check
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will update currentUser and loadingAuth
      return userCredential;
    } catch (error: any) {
      console.error("Login error in AuthContext:", error);
      return error.code || error.message || "Lỗi đăng nhập không xác định";
    }
    // finally {
    //   setLoadingAuth(false); // Let onAuthStateChanged handle this
    // }
  };

  const logout = async () => {
    setLoadingAuth(true); // Indicate loading during logout process
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set currentUser to null and loadingAuth to false
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      setLoadingAuth(false); // Ensure loading is false on error
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
