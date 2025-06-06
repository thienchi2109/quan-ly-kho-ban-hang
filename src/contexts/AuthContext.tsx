
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  GoogleAuthProvider, // Thêm GoogleAuthProvider
  signInWithPopup,    // Thêm signInWithPopup
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<UserCredential | string>; // Giữ lại nếu cần fallback
  signInWithGoogle: () => Promise<UserCredential | string>; // Thêm phương thức mới
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

  // Đăng nhập bằng email/password (giữ lại phòng trường hợp cần)
  const login = async (email: string, pass: string): Promise<UserCredential | string> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential;
    } catch (error: any) {
      console.error("Login error in AuthContext:", error);
      return error.code || error.message || "Lỗi đăng nhập không xác định";
    }
  };

  // Đăng nhập bằng Google
  const signInWithGoogle = async (): Promise<UserCredential | string> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // UserCredential sẽ có trong result
      // Firebase tự động xử lý việc lấy token, v.v.
      // onAuthStateChanged sẽ được kích hoạt, cập nhật currentUser
      return result;
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      // Các mã lỗi thường gặp: 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/popup-blocked'
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
      // setLoadingAuth(false); // onAuthStateChanged sẽ xử lý
    }
    // setLoadingAuth(false) được xử lý bởi onAuthStateChanged khi user là null
  };

  const value = {
    currentUser,
    loadingAuth,
    login, // Giữ lại
    signInWithGoogle, // Thêm mới
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
