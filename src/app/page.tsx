'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/contexts/GroupContext';

export default function Home() {
  const router = useRouter();
  const { group, loading, error, accessGroup, accessAdminGroup, createGroup, clearError } = useGroup();
  
  const [activeTab, setActiveTab] = useState<'access' | 'create' | 'admin'>('access');
  const [accessKey, setAccessKey] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [groupName, setGroupName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAdminKey, setCreatedAdminKey] = useState<string | null>(null);
  const [saveAccessKey, setSaveAccessKey] = useState(false);
  
  // ローカルストレージからアクセスキーを読み込む
  useEffect(() => {
    const savedAccessKey = localStorage.getItem('savedAccessKey');
    if (savedAccessKey) {
      setAccessKey(savedAccessKey);
      setSaveAccessKey(true);
    }
    
    const savedAdminKey = localStorage.getItem('savedAdminKey');
    if (savedAdminKey) {
      setAdminKey(savedAdminKey);
    }
  }, []);
  
  // グループ情報に基づいてリダイレクト
  useEffect(() => {
    if (group && !createdAdminKey) {
      if (group.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/group');
      }
    }
  }, [group, createdAdminKey, router]);
  
  // グループにアクセス
  const handleAccessGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !accessKey.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // アクセスキーを保存するかどうか
      if (saveAccessKey) {
        localStorage.setItem('savedAccessKey', accessKey.trim());
      } else {
        localStorage.removeItem('savedAccessKey');
      }
      
      await accessGroup(accessKey.trim());
    } catch (err) {
      console.error('グループへのアクセスに失敗しました:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 管理者としてアクセス
  const handleAdminAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !adminKey.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // 管理者キーを保存するかどうか
      if (saveAccessKey) {
        localStorage.setItem('savedAdminKey', adminKey.trim());
      } else {
        localStorage.removeItem('savedAdminKey');
      }
      
      await accessAdminGroup(adminKey.trim());
    } catch (err) {
      console.error('管理者アクセスに失敗しました:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // グループを作成
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !groupName.trim() || !adminPassword.trim()) return;
    
    try {
      setIsSubmitting(true);
      const adminKey = await createGroup(groupName.trim(), adminPassword.trim());
      setCreatedAdminKey(adminKey);
    } catch (err) {
      console.error('グループの作成に失敗しました:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // リダイレクト中の表示
  if (group && !createdAdminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">リダイレクト中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          シフト作成アプリ
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          簡単にシフト希望を共有・管理できるツール
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
              <button 
                className="text-sm underline ml-2"
                onClick={clearError}
              >
                閉じる
              </button>
            </div>
          )}
          
          {createdAdminKey ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-bold">グループが作成されました！</p>
                <p className="mt-2">以下の管理者キーを保存してください。このキーを使って管理者としてアクセスできます。</p>
              </div>
              
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <p className="font-mono text-lg break-all">{createdAdminKey}</p>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/admin')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  管理画面へ進む
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex border-b border-gray-200">
                <button
                  className={`flex-1 py-2 px-1 text-center ${activeTab === 'access' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('access')}
                >
                  グループにアクセス
                </button>
                <button
                  className={`flex-1 py-2 px-1 text-center ${activeTab === 'create' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('create')}
                >
                  新規グループ作成
                </button>
                <button
                  className={`flex-1 py-2 px-1 text-center ${activeTab === 'admin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('admin')}
                >
                  管理者アクセス
                </button>
              </div>
              
              <div className="mt-6">
                {activeTab === 'access' && (
                  <form onSubmit={handleAccessGroup}>
                    <div>
                      <label htmlFor="accessKey" className="block text-sm font-medium text-gray-700">
                        アクセスキー
                      </label>
                      <div className="mt-1">
                        <input
                          id="accessKey"
                          name="accessKey"
                          type="text"
                          required
                          value={accessKey}
                          onChange={(e) => setAccessKey(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="グループのアクセスキーを入力"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center">
                        <input
                          id="saveAccessKey"
                          name="saveAccessKey"
                          type="checkbox"
                          checked={saveAccessKey}
                          onChange={(e) => setSaveAccessKey(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="saveAccessKey" className="ml-2 block text-sm text-gray-700">
                          アクセスキーを保存する
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        ※このデバイスにアクセスキーを保存します。共有デバイスでは注意してください。
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !accessKey.trim()}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isSubmitting || !accessKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? '処理中...' : 'アクセス'}
                      </button>
                    </div>
                  </form>
                )}
                
                {activeTab === 'create' && (
                  <form onSubmit={handleCreateGroup}>
                    <div>
                      <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                        グループ名
                      </label>
                      <div className="mt-1">
                        <input
                          id="groupName"
                          name="groupName"
                          type="text"
                          required
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="例: 〇〇店シフト"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                        管理者パスワード
                      </label>
                      <div className="mt-1">
                        <input
                          id="adminPassword"
                          name="adminPassword"
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="管理者用のパスワードを設定"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        ※このパスワードは管理者機能にアクセスする際に必要です
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !groupName.trim() || !adminPassword.trim()}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isSubmitting || !groupName.trim() || !adminPassword.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? '処理中...' : 'グループを作成'}
                      </button>
                    </div>
                  </form>
                )}
                
                {activeTab === 'admin' && (
                  <form onSubmit={handleAdminAccess}>
                    <div>
                      <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700">
                        管理者キー
                      </label>
                      <div className="mt-1">
                        <input
                          id="adminKey"
                          name="adminKey"
                          type="text"
                          required
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="管理者キーを入力"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center">
                        <input
                          id="saveAdminKey"
                          name="saveAdminKey"
                          type="checkbox"
                          checked={saveAccessKey}
                          onChange={(e) => setSaveAccessKey(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="saveAdminKey" className="ml-2 block text-sm text-gray-700">
                          管理者キーを保存する
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        ※このデバイスに管理者キーを保存します。共有デバイスでは注意してください。
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !adminKey.trim()}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isSubmitting || !adminKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? '処理中...' : '管理者としてアクセス'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            シフト作成アプリは、グループを作成してアクセスキーを共有するだけで、簡単にシフト希望を管理できるツールです。
          </p>
        </div>
      </div>
    </div>
  );
}
