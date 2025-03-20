'use client';

import React, { useState, useEffect } from 'react';
import ShiftTable from '@/components/ShiftTable';
import ShiftModal from '@/components/ShiftModal';
import StaffForm from '@/components/StaffForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useStaffApi, useShiftApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftData, ShiftInfo } from '@/types';

// APIエラー型の定義
interface ApiError {
  message: string;
  status?: number;
}

export default function ManagerPage() {
  const { user, signOut } = useAuth();
  
  // API Hooks
  const staffApi = useStaffApi();
  const shiftApi = useShiftApi();
  
  // 状態管理
  const [staffData, setStaffData] = useState<ShiftData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const datesResponse = await shiftApi.getDates();
        if (datesResponse.success && datesResponse.data) {
          setDates(datesResponse.data as string[]);
        }
        
        const staffResponse = await staffApi.getStaffList();
        if (staffResponse.success && staffResponse.data) {
          setStaffData(staffResponse.data as ShiftData[]);
        }
        
        setLoading(false);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        setError(apiError.message || 'データの読み込みに失敗しました');
        console.error('データ読み込みエラー:', apiError);
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [shiftApi, staffApi]);

  // シフトセルがクリックされたときの処理
  const handleCellClick = (staffId: string, date: string) => {
    const staff = staffData.find(s => s.staff_id === staffId);
    if (staff) {
      setSelectedStaff({ id: staffId, name: staff.name });
      setSelectedDate(date);
      setModalOpen(true);
    }
  };

  // シフト情報が保存されたときの処理
  const handleShiftSave = async (shiftInfo: ShiftInfo) => {
    if (!selectedStaff || !selectedDate) return;
    
    try {
      const response = await shiftApi.updateShift(selectedStaff.id, selectedDate, shiftInfo);
      
      if (response) {
        setStaffData(prevData => 
          prevData.map(staff => {
            if (staff.staff_id === selectedStaff.id) {
              return {
                ...staff,
                shifts: {
                  ...staff.shifts,
                  [selectedDate]: shiftInfo
                }
              };
            }
            return staff;
          })
        );
        
        setModalOpen(false);
      } else {
        setError('シフトの更新に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'シフトの更新中にエラーが発生しました');
      console.error('シフト更新エラー:', apiError);
    }
  };

  // スタッフ追加の処理
  const handleAddStaff = async (name: string) => {
    try {
      const response = await staffApi.addStaff(name);
      
      if (response.success && response.data) {
        setStaffData(prev => [...prev, response.data as ShiftData]);
      } else {
        setError(response.error || 'スタッフの追加に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'スタッフの追加中にエラーが発生しました');
      console.error('スタッフ追加エラー:', apiError);
    }
  };

  // スタッフ削除の処理
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) return;
    
    try {
      const response = await staffApi.deleteStaff(staffId);
      
      if (response.success) {
        setStaffData(prev => prev.filter(staff => staff.staff_id !== staffId));
      } else {
        setError(response.error || 'スタッフの削除に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'スタッフの削除中にエラーが発生しました');
      console.error('スタッフ削除エラー:', apiError);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold">シフト作成アプリ</h1>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.name}</span>（管理者）
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
          <p className="text-gray-600 mt-2">管理者ダッシュボード</p>
        </header>

        <main className="max-w-6xl mx-auto">
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
          
          <StaffForm onAddStaff={handleAddStaff} />
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">シフト管理</h2>
            
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : staffData.length > 0 ? (
              <div>
                <ShiftTable 
                  dates={dates} 
                  staffData={staffData} 
                  onCellClick={handleCellClick} 
                />
                
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">スタッフ管理</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 border border-gray-200 bg-gray-100">スタッフ名</th>
                          <th className="px-4 py-2 border border-gray-200 bg-gray-100">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffData.map((staff) => (
                          <tr key={`staff-${staff.staff_id}`}>
                            <td className="px-4 py-2 border border-gray-200">{staff.name}</td>
                            <td className="px-4 py-2 border border-gray-200">
                              <button
                                onClick={() => handleDeleteStaff(staff.staff_id)}
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                              >
                                削除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                スタッフデータがありません
              </p>
            )}
            
            <div className="mt-4 text-sm text-gray-600">
              <p>※セルをクリックしてシフトを編集できます</p>
            </div>
          </div>
        </main>
        
        {selectedStaff && (
          <ShiftModal 
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleShiftSave}
            staffName={selectedStaff.name}
            date={selectedDate}
            currentShift={selectedStaff ? staffData.find(s => s.staff_id === selectedStaff.id)?.shifts[selectedDate] : undefined}
          />
        )}
      </div>
    </ProtectedRoute>
  );
} 