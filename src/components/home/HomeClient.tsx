'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/contexts/GroupContext';
import { logger } from '@/lib/logger';

type HomeClientProps = {
  header: ReactNode;
  footer: ReactNode;
};

export default function HomeClient({ header, footer }: HomeClientProps) {
  const router = useRouter();
  const { group, error, accessGroup, accessAdminGroup, createGroup, clearError } = useGroup();

  const [activeTab, setActiveTab] = useState<'access' | 'create' | 'admin'>('access');
  const [accessKey, setAccessKey] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAdminKey, setCreatedAdminKey] = useState<string | null>(null);
  const [saveAccessKey, setSaveAccessKey] = useState(false);

  useEffect(() => {
    const savedAccessKey = localStorage.getItem('savedAccessKey');
    if (savedAccessKey) {
      setAccessKey(savedAccessKey);
      setSaveAccessKey(true);
    }

    // savedAdminKey はセキュリティリスクのため保存しない。既存データがあれば削除する。
    localStorage.removeItem('savedAdminKey');
  }, []);

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

  const handleAccessGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !accessKey.trim()) return;

    try {
      setIsSubmitting(true);

      if (saveAccessKey) {
        localStorage.setItem('savedAccessKey', accessKey.trim());
      } else {
        localStorage.removeItem('savedAccessKey');
      }

      await accessGroup(accessKey.trim());
    } catch (err) {
      logger.error('グループへのアクセスに失敗しました:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !adminKey.trim()) return;

    try {
      setIsSubmitting(true);
      // adminKey は localStorage に保存しない（漏洩リスク軽減）
      await accessAdminGroup(adminKey.trim());
    } catch (err) {
      logger.error('管理者アクセスに失敗しました:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !groupName.trim()) return;

    try {
      setIsSubmitting(true);
      logger.log('グループ作成開始:', { name: groupName.trim() });

      const adminKeyResult = await createGroup(groupName.trim());
      logger.log('グループ作成成功:', { adminKey: adminKeyResult });

      setCreatedAdminKey(adminKeyResult);
    } catch (err) {
      logger.error('グループの作成に失敗しました:', err);
      if (err instanceof Error) {
        logger.error('エラー詳細:', err.message);
        logger.error('エラースタック:', err.stack);
      } else {
        logger.error('不明なエラー:', JSON.stringify(err, null, 2));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (group && !createdAdminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-sky-800">リダイレクト中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      {header}
      <div className="mt-6 sm:mt-8 w-full sm:mx-auto sm:max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-md rounded-xl border border-sky-100">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <p className="flex items-center text-sm">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
          <button
            className="text-red-700 hover:text-red-800 transition-colors duration-200"
            onClick={clearError}
            type="button"
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
            <svg
              className="h-6 w-6 mx-auto mb-2 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-lg">グループが作成されました！</p>
            <p className="mt-2 text-sm">
              以下の管理者キーを保存してください。このキーを使って管理者としてアクセスできます。
            </p>
          </div>

          <div className="mt-4 p-4 bg-sky-50 rounded-lg border border-sky-200">
            <p className="font-mono text-base sm:text-lg break-all text-sky-800">{createdAdminKey}</p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200"
            >
              管理画面へ進む
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex border-b border-sky-200">
            <button
              type="button"
              className={`flex-1 py-2 px-1 text-center text-sm font-medium transition-colors duration-200 ${
                activeTab === 'access' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-sky-500 hover:text-sky-700'
              }`}
              onClick={() => setActiveTab('access')}
            >
              グループにアクセス
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-1 text-center text-sm font-medium transition-colors duration-200 ${
                activeTab === 'create' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-sky-500 hover:text-sky-700'
              }`}
              onClick={() => setActiveTab('create')}
            >
              新規グループ作成
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-1 text-center text-sm font-medium transition-colors duration-200 ${
                activeTab === 'admin' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-sky-500 hover:text-sky-700'
              }`}
              onClick={() => setActiveTab('admin')}
            >
              管理者アクセス
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'access' && (
              <form onSubmit={handleAccessGroup} className="space-y-5">
                <div>
                  <label htmlFor="accessKey" className="block text-sm font-medium text-sky-700">
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
                      className="appearance-none block w-full px-3 py-2 border border-sky-400 rounded-lg shadow-sm text-sky-900 dark:text-sky-100 placeholder-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
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
                      className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-sky-300 rounded transition-colors duration-200"
                    />
                    <label htmlFor="saveAccessKey" className="ml-2 block text-sm text-sky-700">
                      アクセスキーを保存する
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-sky-600">
                    ※このデバイスにアクセスキーを保存します。共有デバイスでは注意してください。
                  </p>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !accessKey.trim()}
                    className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200 ${
                      isSubmitting || !accessKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        処理中...
                      </div>
                    ) : (
                      'アクセス'
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'create' && (
              <form onSubmit={handleCreateGroup} className="space-y-5">
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-sky-700">
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
                      className="appearance-none block w-full px-3 py-2 border border-sky-400 rounded-lg shadow-sm text-sky-900 dark:text-sky-100 placeholder-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                      placeholder="新しいグループの名前"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !groupName.trim()}
                    className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200 ${
                      isSubmitting || !groupName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        作成中...
                      </div>
                    ) : (
                      'グループを作成'
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'admin' && (
              <form onSubmit={handleAdminAccess} className="space-y-5">
                <div>
                  <label htmlFor="adminKey" className="block text-sm font-medium text-sky-700">
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
                      className="appearance-none block w-full px-3 py-2 border border-sky-400 rounded-lg shadow-sm text-sky-900 dark:text-sky-100 placeholder-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors duration-200"
                      placeholder="管理者キーを入力"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !adminKey.trim()}
                    className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200 ${
                      isSubmitting || !adminKey.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        処理中...
                      </div>
                    ) : (
                      '管理者としてアクセス'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
        </div>
        {footer}
      </div>
    </div>
  );
}
