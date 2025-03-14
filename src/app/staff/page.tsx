'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftApi } from '@/hooks/useApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ShiftInfo } from '@/types';

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
        
        // 日付データの取得
        const datesResponse = await shiftApi.getDates();
        if (datesResponse.success && datesResponse.data) {
          setDates(datesResponse.data as string[]);
        }
        
        // スタッフのシフトデータを取得
        const shiftsResponse = await shiftApi.getStaffShifts(user.id);
        if (shiftsResponse.success && shiftsResponse.data) {
          setShifts(shiftsResponse.data as Record<string, ShiftInfo>);
        }
        
        setLoading(false);
      } catch (err) {
        setError('シフトデータの読み込みに失敗しました');
        setLoading(false);
      }
    };
    
    fetchStaffShifts();
  }, [user]);

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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold">シフト作成アプリ</h1>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.name}</span>（スタッフ）
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                ログアウト
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">スタッフダッシュボード</p>
        </header>

        <main className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
              <button 
                className="text-sm underline ml-2"
                onClick={() => setError(null)}
              >
                閉じる
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">あなたのシフト</h2>
            
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : dates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border border-gray-200 bg-gray-100">日付</th>
                      <th className="px-4 py-2 border border-gray-200 bg-gray-100">シフト</th>
                      <th className="px-4 py-2 border border-gray-200 bg-gray-100">詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => {
                      const shift = shifts[date];
                      const { text, bgColor, textColor } = getShiftDisplay(shift);
                      
                      return (
                        <tr key={date}>
                          <td className="px-4 py-2 border border-gray-200">{date}</td>
                          <td className={`px-4 py-2 border border-gray-200 ${bgColor} ${textColor}`}>
                            {text}
                          </td>
                          <td className="px-4 py-2 border border-gray-200">
                            {shift?.isWorking ? (
                              <div>
                                <p>勤務時間: {shift.startTime} - {shift.endTime}</p>
                                {shift.note && <p>備考: {shift.note}</p>}
                              </div>
                            ) : shift ? (
                              <div>
                                <p>休み</p>
                                {shift.note && <p>備考: {shift.note}</p>}
                              </div>
                            ) : (
                              <p>シフトが設定されていません</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                シフトデータがありません
              </p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 mt-6">
            <h2 className="text-xl font-bold mb-4">お知らせ</h2>
            <p className="text-gray-600">
              シフトに関する質問や変更依頼は管理者にお問い合わせください。
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 