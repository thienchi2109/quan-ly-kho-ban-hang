
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
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<UserCredential | string>; // Returns UserCredential on success, error string on failure
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Initialize as true
  const auth = getAuth(app);
  const router = useRouter(); // useRouter can be initialized here

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
      // if (!user) {
      //   // Optionally clear the auth token cookie if you were setting one
      //   // document.cookie = "firebaseAuthToken=; path=/; max-age=0";
      // } else {
      //   // Optionally set an auth token cookie if middleware needs it (advanced)
      //   // user.getIdToken().then(token => {
      //   //   document.cookie = `firebaseAuthToken=${token}; path=/; max-age=3600`; // Example: 1 hour
      //   // });
      // }
    });
    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, pass: string): Promise<UserCredential | string> => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // setCurrentUser(userCredential.user); // onAuthStateChanged will handle this
      // router.push('/dashboard'); // Let the calling component handle redirection based on success
      return userCredential;
    } catch (error: any) {
      console.error("Login error in AuthContext:", error);
      return error.code || error.message || "Lỗi đăng nhập không xác định";
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      // setCurrentUser(null); // onAuthStateChanged will handle this
      router.push('/login'); // Redirect to login after logout
    } catch (error) {
      console.error("Logout error:", error);
      // Optionally show a toast for logout errors
    } finally {
      setLoadingAuth(false);
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
