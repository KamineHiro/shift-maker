'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/contexts/GroupContext';
import { useStaffApi, useShiftApi } from '@/hooks/useApi';
import { ShiftData, ShiftInfo } from '@/types';
import { formatDisplayDate } from '@/utils/helpers';
import ShiftModal from '@/components/ShiftModal';

// ShiftDataに確定状態を追加
interface ExtendedShiftData extends ShiftData {
  isConfirmed?: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const { group, leaveGroup } = useGroup();
  const staffApi = useStaffApi();
  const shiftApi = useShiftApi();
  
  const [staffData, setStaffData] = useState<ExtendedShiftData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shiftDays, setShiftDays] = useState<number>(14);
  const [showDateSettings, setShowDateSettings] = useState(false);
  const [copyAccessKeySuccess, setCopyAccessKeySuccess] = useState<string | null>(null);
  const [copyAdminKeySuccess, setCopyAdminKeySuccess] = useState<string | null>(null);
  
  // グループ情報がない場合、または管理者でない場合はトップページにリダイレクト
  useEffect(() => {
    if (!group) {
      router.push('/');
    } else if (!group.isAdmin) {
      router.push('/group');
    }
  }, [group, router]);
  
  // 初期データの読み込み
  useEffect(() => {
    let isSubscribed = true;

    const fetchInitialData = async () => {
      if (!group) return;
      
      try {
        // エラー状態をリセット
        if (isSubscribed) {
          setError(null);
        }
        
        // グループの日付範囲を取得
        const dateRangeResponse = await shiftApi.getDateRange(group.groupId);
        if (!isSubscribed) return;

        if (dateRangeResponse.success && dateRangeResponse.data) {
          const { startDate: savedStartDate, days } = dateRangeResponse.data;
          setStartDate(savedStartDate);
          setShiftDays(days);
          
          // 日付データの取得
          const datesResponse = await shiftApi.getDates(new Date(savedStartDate), days);
          if (!isSubscribed) return;

          if (datesResponse.success && datesResponse.data) {
            setDates(datesResponse.data as string[]);
          }
        } else {
          // デフォルトの日付データを取得
          const datesResponse = await shiftApi.getDates();
          if (!isSubscribed) return;

          if (datesResponse.success && datesResponse.data) {
            setDates(datesResponse.data as string[]);
          }
        }
        
        // スタッフデータの取得
        const staffResponse = await staffApi.getStaffList(group.groupId);
        if (!isSubscribed) return;

        if (staffResponse.success && staffResponse.data) {
          const staffList = staffResponse.data as ShiftData[];
          
          // 各スタッフの確定状態を取得
          const extendedStaffList = staffList.map(staff => {
            const isConfirmed = localStorage.getItem(`shiftConfirmed_${group.groupId}_${staff.id}`) === 'true';
            return {
              ...staff,
              isConfirmed
            };
          });
          
          setStaffData(extendedStaffList);
        }
      } catch (err) {
        if (isSubscribed) {
          setError('データの読み込みに失敗しました');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };
    
    setLoading(true);
    fetchInitialData();

    return () => {
      isSubscribed = false;
    };
  }, [group?.groupId]);  // shiftApiとstaffApiは依存関係から除外
  
  // 日付範囲を保存
  const handleSaveDateRange = async () => {
    if (!group) return;
    
    try {
      setLoading(true);
      
      // 日付範囲を保存
      await shiftApi.saveDateRange(group.groupId, startDate, shiftDays);
      
      // 新しい日付データを取得
      const datesResponse = await shiftApi.getDates(new Date(startDate), shiftDays);
      if (datesResponse.success && datesResponse.data) {
        setDates(datesResponse.data as string[]);
      }
      
      setShowDateSettings(false);
      setLoading(false);
    } catch (err) {
      setError('日付範囲の保存に失敗しました');
      setLoading(false);
    }
  };
  
  // シフトセルがクリックされたときの処理
  const handleCellClick = (staffId: string, date: string) => {
    const staff = staffData.find(s => s.id === staffId);
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
      
      if (response.success) {
        // 成功したら、ローカルの状態も更新
        setStaffData(prevData => 
          prevData.map(staff => {
            if (staff.id === selectedStaff.id) {
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
        // エラーメッセージを表示
        setError(response.error || 'シフトの更新に失敗しました');
      }
    } catch (err) {
      setError('シフトの更新中にエラーが発生しました');
    }
  };
  
  // スタッフ追加の処理
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !newStaffName.trim()) return;
    
    try {
      setLoading(true);
      
      const response = await staffApi.addStaff(newStaffName.trim(), group.groupId);
      
      if (response.success && response.data) {
        // 成功したら、ローカルの状態も更新
        const newStaff = response.data as ShiftData;
        setStaffData(prev => [...prev, { ...newStaff, isConfirmed: false }]);
        setNewStaffName('');
      } else {
        // エラーメッセージを表示
        setError(response.error || 'スタッフの追加に失敗しました');
      }
    } catch (err) {
      setError('スタッフの追加中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  // スタッフ削除の処理
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) return;
    
    try {
      const response = await staffApi.deleteStaff(staffId);
      
      if (response.success) {
        // 成功したら、ローカルの状態も更新
        setStaffData(prev => prev.filter(staff => staff.id !== staffId));
      } else {
        // エラーメッセージを表示
        setError(response.error || 'スタッフの削除に失敗しました');
      }
    } catch (err) {
      setError('スタッフの削除中にエラーが発生しました');
    }
  };
  
  // アクセスキーをクリップボードにコピー
  const copyAccessKeyToClipboard = () => {
    if (!group?.accessKey) return;
    
    navigator.clipboard.writeText(group.accessKey)
      .then(() => {
        setCopyAccessKeySuccess('コピーしました！');
        setTimeout(() => setCopyAccessKeySuccess(null), 2000);
      })
      .catch(() => {
        setCopyAccessKeySuccess('コピーに失敗しました');
        setTimeout(() => setCopyAccessKeySuccess(null), 2000);
      });
  };
  
  // 管理者キーをクリップボードにコピー
  const copyAdminKeyToClipboard = () => {
    if (!group?.adminKey) return;
    
    navigator.clipboard.writeText(group.adminKey)
      .then(() => {
        setCopyAdminKeySuccess('コピーしました！');
        setTimeout(() => setCopyAdminKeySuccess(null), 2000);
      })
      .catch(() => {
        setCopyAdminKeySuccess('コピーに失敗しました');
        setTimeout(() => setCopyAdminKeySuccess(null), 2000);
      });
  };
  
  // 6週間以上前のデータを自動的に削除
  useEffect(() => {
    let isSubscribed = true;
    let interval: NodeJS.Timeout;

    const cleanupOldData = async () => {
      if (!group?.groupId || !isSubscribed) return;

      try {
        const response = await shiftApi.cleanupOldShifts();
        if (!response.success && isSubscribed) {
          console.warn('古いシフトデータの自動削除:', response.error);
        } else if (response.success && response.message) {
          console.info('自動クリーンアップ:', response.message);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error('古いシフトデータの自動削除中にエラーが発生しました:', err);
        }
      }
    };

    // 初回実行（1分後に実行）
    const initialTimeout = setTimeout(() => {
      cleanupOldData();
      // その後24時間ごとに実行
      interval = setInterval(cleanupOldData, 24 * 60 * 60 * 1000);
    }, 60 * 1000);

    return () => {
      isSubscribed = false;
      clearTimeout(initialTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [group?.groupId]); // shiftApiは依存関係から除外
  
  if (!group || !group.isAdmin) {
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">シフト作成アプリ</h1>
          <button
            onClick={leaveGroup}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            グループを離れる
          </button>
        </div>
        <p className="text-gray-600 mt-2">管理者ダッシュボード - グループ: {group.groupName}</p>
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
        
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">データ管理</h2>
            <p className="text-sm text-gray-600">
              6週間以上前のシフトデータは自動的に削除されます
            </p>
          </div>
          <p className="text-gray-600 text-sm">
            シフトデータは毎日自動的にクリーンアップされ、6週間以上前のデータは削除されます。
            これにより、データベースの容量を効率的に管理し、アプリケーションのパフォーマンスを維持します。
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-bold mb-4">スタッフ追加</h2>
          <form onSubmit={handleAddStaff} className="flex items-end space-x-4">
            <div className="flex-grow">
              <label htmlFor="newStaffName" className="block text-sm font-medium text-gray-700">
                スタッフ名
              </label>
              <input
                id="newStaffName"
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="新しいスタッフの名前"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newStaffName.trim()}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading || !newStaffName.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              追加
            </button>
          </form>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">シフト管理</h2>
            <button
              onClick={() => setShowDateSettings(!showDateSettings)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showDateSettings ? '閉じる' : '日付範囲を設定'}
            </button>
          </div>
          
          {showDateSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-medium mb-3">シフト期間の設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    開始日
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="shiftDays" className="block text-sm font-medium text-gray-700">
                    日数
                  </label>
                  <select
                    id="shiftDays"
                    value={shiftDays}
                    onChange={(e) => setShiftDays(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value={7}>1週間 (7日)</option>
                    <option value={14}>2週間 (14日)</option>
                    <option value={21}>3週間 (21日)</option>
                    <option value={28}>4週間 (28日)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleSaveDateRange}
                  disabled={loading}
                  className={`w-full md:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? '保存中...' : '期間を保存して適用'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                ※期間を変更すると、すべてのスタッフのシフト希望入力画面に反映されます。
              </p>
            </div>
          )}
          
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : staffData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border border-gray-200 bg-gray-100">スタッフ</th>
                    <th className="px-4 py-2 border border-gray-200 bg-gray-100">状態</th>
                    {dates.map(date => (
                      <th key={date} className="px-4 py-2 border border-gray-200 bg-gray-100">
                        {formatDisplayDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffData.map(staff => (
                    <tr key={staff.id}>
                      <td className="px-4 py-2 border border-gray-200 font-medium">{staff.name}</td>
                      <td className="px-4 py-2 border border-gray-200">
                        {staff.isConfirmed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            確定済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            未確定
                          </span>
                        )}
                      </td>
                      {dates.map(date => {
                        const shift = staff.shifts[date];
                        let cellContent = '未設定';
                        let cellClass = 'bg-gray-100 text-gray-500';
                        
                        if (shift) {
                          if (shift.isWorking) {
                            if (shift.isAllDay) {
                              cellContent = '全日OK';
                              cellClass = 'bg-blue-100 text-blue-800';
                            } else {
                              cellContent = `${shift.startTime} - ${shift.endTime}`;
                              cellClass = 'bg-green-100 text-green-800';
                            }
                          } else {
                            cellContent = '休み';
                            cellClass = 'bg-red-100 text-red-800';
                          }
                        }
                        
                        return (
                          <td 
                            key={`${staff.id}-${date}`}
                            className={`px-4 py-2 border border-gray-200 ${cellClass} cursor-pointer hover:opacity-80`}
                            onClick={() => handleCellClick(staff.id, date)}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              スタッフデータがありません
            </p>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            <p>※セルをクリックしてシフトを編集できます</p>
            <p className="mt-1">※「確定済み」はスタッフがシフト希望を確定したことを示します</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mt-6">
          <h2 className="text-xl font-bold mb-4">スタッフ管理</h2>
          {staffData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border border-gray-200 bg-gray-100">スタッフ名</th>
                    <th className="px-4 py-2 border border-gray-200 bg-gray-100">状態</th>
                    <th className="px-4 py-2 border border-gray-200 bg-gray-100">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((staff) => (
                    <tr key={`staff-${staff.id}`}>
                      <td className="px-4 py-2 border border-gray-200">{staff.name}</td>
                      <td className="px-4 py-2 border border-gray-200">
                        {staff.isConfirmed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            確定済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            未確定
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
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
          ) : (
            <p className="text-gray-500 text-center py-4">
              スタッフデータがありません
            </p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 mt-6">
          <h2 className="text-xl font-bold mb-4">グループ情報</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">アクセスキー</h3>
              <div className="mt-2 p-4 bg-gray-100 rounded-md flex items-center justify-between">
                <p className="font-mono break-all">{group.accessKey}</p>
                <button
                  onClick={copyAccessKeyToClipboard}
                  className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  {copyAccessKeySuccess || 'コピー'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                このキーを共有して、メンバーをグループに招待できます。
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">管理者キー</h3>
              <div className="mt-2 p-4 bg-gray-100 rounded-md flex items-center justify-between">
                <p className="font-mono break-all">{group.adminKey}</p>
                <button
                  onClick={copyAdminKeyToClipboard}
                  className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  {copyAdminKeySuccess || 'コピー'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                このキーは管理者専用です。安全に保管してください。
              </p>
            </div>
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
          currentShift={selectedStaff ? staffData.find(s => s.id === selectedStaff.id)?.shifts[selectedDate] : undefined}
        />
      )}
    </div>
  );
} 