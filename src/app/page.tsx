'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/contexts/GroupContext';

export default function Home() {
  const router = useRouter();
  const { group, error, accessGroup, accessAdminGroup, createGroup, clearError } = useGroup();
  
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
      const redirect = async () => {
        if (group.isAdmin) {
          await router.push('/admin');
        } else {
          await router.push('/group');
        }
      };
      redirect();
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
      console.log('グループ作成開始:', { name: groupName.trim() });
      
      const adminKey = await createGroup(groupName.trim(), adminPassword.trim());
      console.log('グループ作成成功:', { adminKey });
      
      setCreatedAdminKey(adminKey);
    } catch (err) {
      console.error('グループの作成に失敗しました:', err);
      // エラーの詳細を表示
      if (err instanceof Error) {
        console.error('エラー詳細:', err.message);
        console.error('エラースタック:', err.stack);
      } else {
        console.error('不明なエラー:', JSON.stringify(err, null, 2));
      }
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
    <div className="min-h-screen bg-slate-50 flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-slate-800 tracking-tight">
          シフト作成アプリ
        </h1>
        <p className="mt-3 text-center text-lg text-slate-600">
          簡単にシフト希望を共有・管理できます
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <p className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
              <button 
                className="text-red-700 hover:text-red-800 transition-colors duration-200"
                onClick={clearError}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {createdAdminKey ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <svg className="h-6 w-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-bold text-lg">グループが作成されました！</p>
                <p className="mt-2">以下の管理者キーを保存してください。このキーを使って管理者としてアクセスできます。</p>
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-mono text-lg break-all text-slate-800">{createdAdminKey}</p>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/admin')}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200"
                >
                  管理画面へ進む
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex border-b border-slate-200">
                <button
                  className={`flex-1 py-2.5 px-1 text-center font-medium transition-colors duration-200 ${
                    activeTab === 'access' 
                      ? 'border-b-2 border-sky-500 text-sky-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('access')}
                >
                  グループにアクセス
                </button>
                <button
                  className={`flex-1 py-2.5 px-1 text-center font-medium transition-colors duration-200 ${
                    activeTab === 'create' 
                      ? 'border-b-2 border-sky-500 text-sky-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('create')}
                >
                  新規グループ作成
                </button>
                <button
                  className={`flex-1 py-2.5 px-1 text-center font-medium transition-colors duration-200 ${
                    activeTab === 'admin' 
                      ? 'border-b-2 border-sky-500 text-sky-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('admin')}
                >
                  管理者アクセス
                </button>
              </div>
              
              <div className="mt-6">
                {activeTab === 'access' && (
                  <form onSubmit={handleAccessGroup} className="space-y-6">
                    <div>
                      <label htmlFor="accessKey" className="block text-sm font-medium text-slate-700">
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
                          className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                          placeholder="グループのアクセスキーを入力"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <input
                          id="saveAccessKey"
                          name="saveAccessKey"
                          type="checkbox"
                          checked={saveAccessKey}
                          onChange={(e) => setSaveAccessKey(e.target.checked)}
                          className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded transition-colors duration-200"
                        />
                        <label htmlFor="saveAccessKey" className="ml-2 block text-sm text-slate-700">
                          アクセスキーを保存する
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        ※このデバイスにアクセスキーを保存します。共有デバイスでは注意してください。
                      </p>
                    </div>
                    
                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !accessKey.trim()}
                        className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 ${
                          isSubmitting || !accessKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            処理中...
                          </div>
                        ) : 'アクセス'}
                      </button>
                    </div>
                  </form>
                )}
                
                {activeTab === 'create' && (
                  <form onSubmit={handleCreateGroup} className="space-y-6">
                    <div>
                      <label htmlFor="groupName" className="block text-sm font-medium text-slate-700">
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
                          className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                          placeholder="新しいグループの名前"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-700">
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
                          className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                          placeholder="管理者用のパスワード"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !groupName.trim() || !adminPassword.trim()}
                        className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 ${
                          isSubmitting || !groupName.trim() || !adminPassword.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            作成中...
                          </div>
                        ) : 'グループを作成'}
                      </button>
                    </div>
                  </form>
                )}
                
                {activeTab === 'admin' && (
                  <form onSubmit={handleAdminAccess} className="space-y-6">
                    <div>
                      <label htmlFor="adminKey" className="block text-sm font-medium text-slate-700">
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
                          className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                          placeholder="管理者キーを入力"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center">
                        <input
                          id="saveAdminKey"
                          name="saveAdminKey"
                          type="checkbox"
                          checked={saveAccessKey}
                          onChange={(e) => setSaveAccessKey(e.target.checked)}
                          className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded transition-colors duration-200"
                        />
                        <label htmlFor="saveAdminKey" className="ml-2 block text-sm text-slate-700">
                          管理者キーを保存する
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        ※このデバイスに管理者キーを保存します。共有デバイスでは注意してください。
                      </p>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !adminKey.trim()}
                        className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 ${
                          isSubmitting || !adminKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            処理中...
                          </div>
                        ) : '管理者としてアクセス'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
