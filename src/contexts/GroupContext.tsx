'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { groupService } from '@/services/groupService';
import { GroupAccess } from '@/types';

interface GroupContextType {
  group: GroupAccess | null;
  loading: boolean;
  error: string | null;
  accessGroup: (accessKey: string) => Promise<void>;
  accessAdminGroup: (adminKey: string) => Promise<void>;
  createGroup: (name: string, adminPassword: string) => Promise<string>;
  leaveGroup: () => void;
  clearError: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

interface GroupProviderProps {
  children: ReactNode;
}

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const [group, setGroup] = useState<GroupAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ローカルストレージからグループ情報を復元
  useEffect(() => {
    const storedGroup = localStorage.getItem('groupAccess');
    if (storedGroup) {
      try {
        setGroup(JSON.parse(storedGroup));
      } catch (err) {
        console.error('グループ情報の復元に失敗しました:', err);
        localStorage.removeItem('groupAccess');
      }
    }
  }, []);

  // アクセスキーでグループにアクセス
  const accessGroup = async (accessKey: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const groupAccess = await groupService.getGroupByAccessKey(accessKey);
      setGroup(groupAccess);
      
      // ローカルストレージに保存
      localStorage.setItem('groupAccess', JSON.stringify(groupAccess));
      
      router.push('/group');
    } catch (err) {
      console.error('グループへのアクセスに失敗しました:', err);
      setError('無効なアクセスキーです');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 管理者キーでグループにアクセス
  const accessAdminGroup = async (adminKey: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const groupAccess = await groupService.getGroupByAdminKey(adminKey);
      setGroup(groupAccess);
      
      // ローカルストレージに保存
      localStorage.setItem('groupAccess', JSON.stringify(groupAccess));
      
      router.push('/admin');
    } catch (err) {
      console.error('管理者グループへのアクセスに失敗しました:', err);
      setError('無効な管理者キーです');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 新しいグループを作成
  const createGroup = async (name: string, adminPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const newGroup = await groupService.createGroup(name, adminPassword);
      
      // 管理者としてグループにアクセス
      const groupAccess: GroupAccess = {
        groupId: newGroup.id,
        groupName: newGroup.name,
        isAdmin: true
      };
      
      setGroup(groupAccess);
      
      // ローカルストレージに保存
      localStorage.setItem('groupAccess', JSON.stringify(groupAccess));
      
      // 管理者キーを返す
      return newGroup.adminKey;
    } catch (err) {
      console.error('グループの作成に失敗しました:', err);
      setError('グループの作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // グループから離脱
  const leaveGroup = () => {
    setGroup(null);
    localStorage.removeItem('groupAccess');
    router.push('/');
  };

  // エラーをクリア
  const clearError = () => {
    setError(null);
  };

  const value = {
    group,
    loading,
    error,
    accessGroup,
    accessAdminGroup,
    createGroup,
    leaveGroup,
    clearError
  };

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}; 