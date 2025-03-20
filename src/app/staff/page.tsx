'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftApi } from '@/hooks/useApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ShiftInfo } from '@/types';
import { formatDisplayDate } from '@/utils/helpers';

// APIエラー型の定義
interface ApiError {
  message: string;
  status?: number;
}

export default function StaffPage() {
  const { user, signOut } = useAuth();
  const shiftApi = useShiftApi();
  
  const [shifts, setShifts] = useState<Record<string, ShiftInfo>>({});
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaffShifts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const datesResponse = await shiftApi.getDates();
        if (datesResponse.success && datesResponse.data) {
          setDates(datesResponse.data as string[]);
        }
        
        const shiftsResponse = await shiftApi.getStaffShifts(user.id);
        if (shiftsResponse.success && shiftsResponse.data) {
          setShifts(shiftsResponse.data as Record<string, ShiftInfo>);
        }
        
        setLoading(false);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        setError(apiError.message || 'シフトデータの読み込みに失敗しました');
        console.error('シフトデータ読み込みエラー:', apiError);
        setLoading(false);
      }
    };
    
    fetchStaffShifts();
  }, [user, shiftApi]);

  // シフト状態に応じたスタイルとテキストを取得
  const getShiftDisplay = (shift?: ShiftInfo) => {
    if (!shift) {
      return {
        text: '未設定',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-500'
      };
    }
    
    if (shift.isWorking) {
      return {
        text: `${shift.startTime} - ${shift.endTime}`,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
    } else {
      return {
        text: '休み',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      };
    }
  };

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <div className="min-h-screen bg-slate-50">
        {/* ヘッダーセクション */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">
                  シフト作成アプリ
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  スタッフダッシュボード
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{user.name}</span>
                    <span className="ml-1">（スタッフ）</span>
                  </div>
                )}
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-200"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 bg-white border-l-4 border-red-500 rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex text-red-500 hover:text-red-600 focus:outline-none"
                  >
                    <span className="sr-only">閉じる</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* シフト表示セクション */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">あなたのシフト</h2>
            
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="ml-3 text-slate-600">読み込み中...</span>
                </div>
              </div>
            ) : dates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        シフト
                      </th>
                      <th className="px-4 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {dates.map((date) => {
                      const shift = shifts[date];
                      const { text, bgColor, textColor } = getShiftDisplay(shift);
                      
                      return (
                        <tr key={date} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {formatDisplayDate(date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                              {text}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {shift?.isWorking ? (
                              <div className="space-y-1">
                                <p className="flex items-center">
                                  <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  勤務時間: {shift.startTime} - {shift.endTime}
                                </p>
                                {shift.note && (
                                  <p className="flex items-center">
                                    <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    備考: {shift.note}
                                  </p>
                                )}
                              </div>
                            ) : shift ? (
                              <div className="space-y-1">
                                <p className="flex items-center">
                                  <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  休み
                                </p>
                                {shift.note && (
                                  <p className="flex items-center">
                                    <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    備考: {shift.note}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="flex items-center text-slate-500">
                                <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                シフトが設定されていません
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2 text-slate-500">シフトデータがありません</p>
              </div>
            )}
          </div>
          
          {/* お知らせセクション */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">お知らせ</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-slate-600">
                    シフトに関する質問や変更依頼は管理者にお問い合わせください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 