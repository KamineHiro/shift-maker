'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { UserData } from '@/types';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'staff' | 'manager') => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('認証状態の確認に失敗しました:', err);
        setError('認証状態の確認に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.signInWithEmail(email, password);
      setUser(userData);
      router.push('/dashboard');
    } catch (err) {
      console.error('ログインに失敗しました:', err);
      setError('メールアドレスまたはパスワードが正しくありません');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'staff' | 'manager') => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.signUp(email, password, name, role);
      setUser(userData);
      router.push('/dashboard');
    } catch (err) {
      console.error('ユーザー登録に失敗しました:', err);
      setError('ユーザー登録に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('ログアウトに失敗しました:', err);
      setError('ログアウトに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 