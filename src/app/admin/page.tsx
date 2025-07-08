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

// エラー型の定義を追加
interface ApiError {
  message: string;
  status?: number;
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
  const [updatingConfirmStatus, setUpdatingConfirmStatus] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  
  // グループ情報がない場合、または管理者でない場合はトップページにリダイレクト
  useEffect(() => {
    if (group === undefined) return; // まだ取得中なら何もしない
    if (!group) {
      router.replace('/');
      return;
    }
    if (!group.isAdmin) {
      router.replace('/group');
      return;
    }
  }, [group]);
  
  // 初期データの読み込み
  useEffect(() => {
    let isSubscribed = true;
    if (!group?.groupId) return;

    const fetchInitialData = async () => {
      try {
        setError(null);
        
        // 日付範囲とスタッフデータを並列で取得
        const [dateRangeResponse, staffResponse] = await Promise.all([
          shiftApi.getDateRange(group.groupId),
          staffApi.getStaffList(group.groupId)
        ]);

        // 日付範囲の処理
        if (isSubscribed && dateRangeResponse.success && dateRangeResponse.data) {
          const { startDate: savedStartDate, days } = dateRangeResponse.data;
          // 現在の値と異なる場合のみ更新
          setStartDate((prev) => prev === savedStartDate ? prev : savedStartDate);
          setShiftDays((prev) => prev === days ? prev : days);
          
          const datesResponse = await shiftApi.getDates(new Date(savedStartDate), days);
          if (isSubscribed && datesResponse.success && datesResponse.data) {
            setDates(datesResponse.data as string[]);
          }
        } else if (isSubscribed) {
          const datesResponse = await shiftApi.getDates();
          if (isSubscribed && datesResponse.success && datesResponse.data) {
            setDates(datesResponse.data as string[]);
          }
        }
        
        // スタッフデータの処理
        if (isSubscribed && staffResponse.success && staffResponse.data) {
          console.log('スタッフデータ取得成功:', staffResponse.data);
          
          // スタッフデータと確定状態を処理
          const staffArray = Array.isArray(staffResponse.data) ? staffResponse.data : [staffResponse.data];
          
          // 各スタッフの確定状態を並列に取得
          const staffWithConfirmation = await Promise.all(
            staffArray.map(async (staff) => {
              const staffId = staff.staff_id || staff.id;
              if (!staffId) {
                console.error('スタッフIDが見つかりません:', staff);
                return staff;
              }
              
              console.log(`確定状態を取得中 - スタッフID: ${staffId}`);
              const confirmResponse = await shiftApi.getShiftConfirmation(staffId);
              return {
                ...staff,
                staff_id: staffId, // staff_idを確実に設定
                isConfirmed: confirmResponse.success && confirmResponse.data 
                  ? confirmResponse.data.isConfirmed 
                  : false
              };
            })
          );
          
          if (isSubscribed) {
            console.log('処理済みスタッフデータ:', staffWithConfirmation);
            setStaffData(staffWithConfirmation);
          }
        } else if (isSubscribed) {
          console.warn('スタッフデータの取得に失敗:', staffResponse.error);
        }
      } catch (error: unknown) {
        if (isSubscribed) {
          console.error('データ読み込みエラー:', error);
          setError('データの読み込みに失敗しました');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isSubscribed = false;
    };
  }, [group?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 日付範囲を保存
  const handleSaveDateRange = async () => {
    if (!group) return;
    
    try {
      setLoading(true);
      
      await shiftApi.saveDateRange(group.groupId, startDate, shiftDays);
      
      const datesResponse = await shiftApi.getDates(new Date(startDate), shiftDays);
      if (datesResponse.success && datesResponse.data) {
        setDates(datesResponse.data as string[]);
      }
      
      setShowDateSettings(false);
      setLoading(false);
    } catch (error) {
      console.error('日付範囲の保存エラー:', error);
      setError('日付範囲の保存に失敗しました');
      setLoading(false);
    }
  };
  
  // シフトセルがクリックされたときの処理
  const handleCellClick = (staffId: string, date: string) => {
    const staff = staffData.find(s => s.staff_id === staffId);
    if (staff) {
      // 確認ダイアログを表示
      const isConfirmed = confirm(`警告: ${staff.name}さんのシフトを編集します。\n\n日付: ${formatDisplayDate(date)}\n\n編集してもよろしいですか？\n\n※変更内容はスタッフに通知されます。メッセージを追加することができます。`);
      
      if (isConfirmed) {
        setSelectedStaff({ id: staffId, name: staff.name });
        setSelectedDate(date);
        setModalOpen(true);
      }
    }
  };
  
  // シフト情報が保存されたときの処理
  const handleShiftSave = async (shiftInfo: ShiftInfo) => {
    if (!selectedStaff || !selectedDate) return;
    
    // メッセージ部分を表示するための条件作成
    const messageText = shiftInfo.message 
      ? `\n\nメッセージ: "${shiftInfo.message}"` 
      : '\n\nメッセージはありません';
    
    // 最終確認ダイアログを表示
    const confirmMessage = shiftInfo.isWorking 
      ? `${selectedStaff.name}さんの${formatDisplayDate(selectedDate)}のシフトを\n「勤務: ${shiftInfo.startTime} - ${shiftInfo.endTime}」\nに設定してよろしいですか？${messageText}` 
      : `${selectedStaff.name}さんの${formatDisplayDate(selectedDate)}のシフトを\n「休み」に設定してよろしいですか？${messageText}`;
    
    const isConfirmed = confirm(confirmMessage);
    if (!isConfirmed) return;
    
    try {
      setLoading(true);
      console.log('管理者がシフト更新を開始:', { 
        staffId: selectedStaff.id, 
        staffName: selectedStaff.name,
        date: selectedDate, 
        shiftInfo 
      });
      
      // 完全なシフト情報を作成（staff_idとdateを追加）
      const completeShiftInfo: ShiftInfo = {
        ...shiftInfo,
        staff_id: selectedStaff.id,
        date: selectedDate,
        updatedBy: 'admin',
        updatedAt: new Date().toISOString()
      };
      
      const response = await shiftApi.updateShift(selectedStaff.id, selectedDate, completeShiftInfo);
      
      if (response) {
        console.log('管理者シフト更新成功:', response);
        // 成功したら、ローカルの状態も更新
        setStaffData(prevData => 
          prevData.map(staff => {
            if (staff.staff_id === selectedStaff.id) {
              return {
                ...staff,
                shifts: {
                  ...staff.shifts,
                  [selectedDate]: {
                    ...completeShiftInfo,
                    staff_id: selectedStaff.id,
                    date: selectedDate
                  }
                }
              };
            }
            return staff;
          })
        );
        
        // 成功メッセージを表示
        setError(`${selectedStaff.name}さんの${formatDisplayDate(selectedDate)}のシフトを更新しました`);
        
        // 3秒後にメッセージを消す
        setTimeout(() => {
          setError(null);
        }, 3000);
        
        setModalOpen(false);
      } else {
        // エラーメッセージを表示
        console.error('管理者シフト更新失敗');
        setError('シフトの更新に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'シフトの更新中にエラーが発生しました');
      console.error('管理者シフト更新エラー:', apiError);
    } finally {
      setLoading(false);
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
        
        // 新しいスタッフの確定状態は初期状態ではfalse
        const extendedNewStaff = {
          ...newStaff,
          isConfirmed: false,
          shifts: {}
        };
        
        setStaffData(prev => [...prev, extendedNewStaff]);
        setNewStaffName('');
      } else {
        // エラーメッセージを表示
        setError(response.error || 'スタッフの追加に失敗しました');
      }
    } catch (err) {
      setError('スタッフの追加中にエラーが発生しました');
      console.error('スタッフ追加エラー:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // スタッフ削除の処理
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) return;
    
    try {
      setLoading(true);
      const response = await staffApi.deleteStaff(staffId);
      
      if (response.success) {
        // 成功したら、ローカルの状態も更新
        setStaffData(prev => prev.filter(staff => staff.staff_id !== staffId));
      } else {
        // エラーメッセージを表示
        setError(response.error || 'スタッフの削除に失敗しました');
      }
    } catch (err) {
      setError('スタッフの削除中にエラーが発生しました');
      console.error('スタッフ削除エラー:', err);
    } finally {
      setLoading(false);
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
    let interval: NodeJS.Timeout | null = null;
    let initialTimeout: NodeJS.Timeout | null = null;

    const cleanupOldData = async () => {
      if (!group?.groupId || !isSubscribed) return;

      try {
        const response = await shiftApi.cleanupOldShifts();
        if (!response.success && isSubscribed) {
          console.warn('古いシフトデータの自動削除:', response.error);
        } else if (response.success && response.data) {
          console.info('自動クリーンアップ:', response.data.message);
        }
      } catch (error: unknown) {
        if (isSubscribed) {
          const apiError = error as ApiError;
          console.error('古いシフトデータの自動削除中にエラーが発生しました:', apiError);
        }
      }
    };

    if (group?.groupId && isSubscribed) {
      // 初回実行（10分後に実行）- 即時実行すると起動時の負荷が高くなる可能性があるため遅延
      initialTimeout = setTimeout(() => {
        if (isSubscribed) {
          console.log('古いシフトデータの初回クリーンアップを実行します');
          cleanupOldData();
          
          // その後24時間ごとに実行
          interval = setInterval(() => {
            if (isSubscribed) {
              console.log('古いシフトデータの定期クリーンアップを実行します');
              cleanupOldData();
            }
          }, 24 * 60 * 60 * 1000); // 24時間ごと
        }
      }, 10 * 60 * 1000); // 10分後
    }

    return () => {
      isSubscribed = false;
      if (initialTimeout) clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, [group?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // シフト確定状態を切り替える関数
  const toggleShiftConfirmation = async (staffId: string, currentStatus: boolean | undefined) => {
    try {
      setUpdatingConfirmStatus(staffId);
      
      let response;
      if (currentStatus) {
        // 現在確定済みなら解除する
        response = await shiftApi.unconfirmShift(staffId);
      } else {
        // 未確定なら確定する
        response = await shiftApi.confirmShift(staffId);
      }
      
      if (response.success && response.data) {
        // 成功したら、ローカルの状態も更新
        setStaffData(prevData => 
          prevData.map(staff => {
            if (staff.staff_id === staffId) {
              return {
                ...staff,
                isConfirmed: response.data?.isConfirmed ?? false
              };
            }
            return staff;
          })
        );
      } else {
        // エラーメッセージを表示
        setError(response.error || 'シフト確定状態の変更に失敗しました');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'シフト確定状態の変更中にエラーが発生しました');
      console.error('シフト確定状態変更エラー:', error);
    } finally {
      setUpdatingConfirmStatus(null);
    }
  };
  
  if (!group || !group.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-sky-700">リダイレクト中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-sky-50">
      {/* ヘッダーセクション */}
      <header className="bg-white border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-2xl font-semibold text-sky-800">
                シフト作成アプリ
              </h1>
              <p className="mt-1 text-sm text-sky-600">
                管理者ダッシュボード - グループ: {group.groupName}
              </p>
            </div>
            <button
              onClick={leaveGroup}
              className="inline-flex items-center px-4 py-2 bg-white border border-sky-200 rounded-lg text-sm font-medium text-sky-700 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-200 shadow-sm"
            >
              グループを離れる
            </button>
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

        {/* シフト管理セクション */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-sky-800">シフト管理表</h2>
            <button
              onClick={() => setShowDateSettings(!showDateSettings)}
              className="inline-flex items-center px-4 py-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition-colors duration-200 shadow-sm"
            >
              {showDateSettings ? (
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              {showDateSettings ? '閉じる' : '日付範囲を設定'}
            </button>
          </div>

          {showDateSettings && (
            <div className="mb-6 bg-sky-50 rounded-lg p-6 border border-sky-200">
              <h3 className="text-lg font-medium text-sky-800 mb-4">シフト期間の設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-sky-700 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-sky-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="shiftDays" className="block text-sm font-medium text-sky-700 mb-1">
                    日数
                  </label>
                  <select
                    id="shiftDays"
                    value={shiftDays}
                    onChange={(e) => setShiftDays(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-sky-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition duration-200"
                  >
                    <option value={7}>1週間 (7日)</option>
                    <option value={14}>2週間 (14日)</option>
                    <option value={21}>3週間 (21日)</option>
                    <option value={28}>4週間 (28日)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSaveDateRange}
                  disabled={loading}
                  className={`
                    inline-flex items-center justify-center w-full md:w-auto px-6 py-2
                    border border-transparent rounded-lg shadow-md text-sm font-medium
                    text-white bg-cyan-600 hover:bg-cyan-700
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
                    transition-colors duration-200
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      保存中...
                    </>
                  ) : '期間を保存して適用'}
                </button>
                <p className="mt-2 text-sm text-sky-600">
                  ※期間を変更すると、すべてのスタッフのシフト希望入力画面に反映されます。
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="ml-3 text-sky-600">読み込み中...</span>
              </div>
            </div>
          ) : staffData.length > 0 ? (
            <div className="relative">
              <div className="overflow-x-auto rounded-lg border border-green-100" style={{ position: 'relative' }}>
                <table className="min-w-full sm:min-w-full divide-y divide-green-200 table-fixed border-collapse">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="sticky left-0 top-0 z-10 bg-green-50 px-1 py-1 sm:px-4 sm:py-1 text-left text-xs sm:text-sm font-medium text-green-700 uppercase tracking-wider min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px]">スタッフ名</th>
                      {dates.map(date => (
                        <th key={date} className="px-1 py-1 sm:px-4 sm:py-1 text-left text-[10px] sm:text-xs font-medium text-green-700 uppercase tracking-wider min-w-[36px] w-[36px] sm:min-w-[100px] sm:w-[100px]">
                          {formatDisplayDate(date)}
                        </th>
                      ))}
                      <th className="px-1 py-1 sm:px-4 sm:py-1 text-left text-xs sm:text-sm font-medium text-green-700 uppercase tracking-wider min-w-[60px] w-[60px] sm:min-w-[100px] sm:w-[100px]">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-green-100">
                    {staffData.map((staff) => (
                      <tr 
                        key={`staff-${staff.staff_id}`} 
                        className="hover:bg-green-50 transition-colors duration-150"
                        onMouseEnter={() => setHoveredRowId(staff.staff_id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td 
                          className={`sticky left-0 top-0 z-10 px-1 py-1 sm:px-4 sm:py-1 whitespace-nowrap min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px] transition-colors duration-150 flex items-center min-h-[40px] sm:min-h-[60px] overflow-hidden ${hoveredRowId === staff.staff_id ? 'bg-green-50' : 'bg-white'}`}
                        >
                          <span className="flex-1 min-w-0 max-w-[4em] truncate text-xs sm:text-sm font-medium text-green-800">{staff.name}</span>
                          {staff.isConfirmed ? (
                            <span className="ml-auto min-w-[16px] max-w-[20px] h-6 flex items-center justify-center px-1 text-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 flex-shrink-0">確</span>
                          ) : (
                            <span className="ml-auto min-w-[16px] max-w-[20px] h-6 flex items-center justify-center px-1 text-center text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-800 flex-shrink-0">未</span>
                          )}
                        </td>
                        {dates.map(date => {
                          const shift = staff.shifts[date];
                          let cellContent = '未設定';
                          let cellClass = 'bg-gray-50 text-gray-600';
                          if (shift) {
                            if (shift.isWorking) {
                              if (shift.isAllDay) {
                                cellContent = '全日OK';
                                cellClass = 'bg-green-100 text-green-800';
                              } else {
                                cellContent = `${shift.startTime} - ${shift.endTime}`;
                                cellClass = 'bg-emerald-100 text-emerald-800';
                              }
                            } else {
                              cellContent = '休み';
                              cellClass = 'bg-red-100 text-red-800';
                            }
                          }
                          return (
                            <td 
                              key={`${staff.staff_id}-${date}`}
                              className={`px-1 py-1 sm:px-4 sm:py-1 min-h-[30px] sm:min-h-[50px] text-[10px] sm:text-xs ${cellClass} cursor-pointer transition-opacity duration-200 hover:opacity-80 min-w-[36px] w-[36px] sm:min-w-[100px] sm:w-[100px] align-middle`}
                              onClick={() => handleCellClick(staff.staff_id, date)}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                        <td className="px-1 py-1 sm:px-4 sm:py-1 whitespace-nowrap text-xs sm:text-sm min-w-[60px] w-[60px] sm:min-w-[100px] sm:w-[100px]">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleShiftConfirmation(staff.staff_id, staff.isConfirmed)}
                              disabled={updatingConfirmStatus === staff.staff_id}
                              className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50"
                            >
                              {updatingConfirmStatus === staff.staff_id ? (
                                <span>処理中...</span>
                              ) : staff.isConfirmed ? (
                                <span>確定解除</span>
                              ) : (
                                <span>確定する</span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200">
                    <tr>
                      <td className="sticky left-0 z-10 bg-white px-1 py-1 sm:px-4 sm:py-1 font-semibold text-slate-700 min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px]">ランチ</td>
                      {dates.map(date => {
                        let lunchCount = 0;
                        staffData.forEach(staff => {
                          const shift = staff.shifts[date];
                          if (!shift || !shift.isWorking) return;
                          if (shift.isAllDay) {
                            lunchCount++;
                            return;
                          }
                          // 時間帯がランチ（10:00-16:00）に少しでもかぶっていればカウント
                          const start = shift.startTime ? parseInt(shift.startTime.replace(':', ''), 10) : null;
                          const end = shift.endTime ? parseInt(shift.endTime.replace(':', ''), 10) : null;
                          if (start !== null && end !== null) {
                            // 1000〜1600の間に少しでも勤務していればOK
                            if (!(end <= 1000 || start >= 1600)) {
                              lunchCount++;
                            }
                          }
                        });
                        return (
                          <td key={date} className="px-1 py-1 sm:px-4 sm:py-1 text-center font-medium text-slate-600 bg-white text-[10px] sm:text-xs min-w-[36px] w-[36px] sm:min-w-[100px] sm:w-[100px]">{lunchCount}</td>
                        );
                      })}
                      <td className="min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px] bg-white"></td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-10 bg-white px-1 py-1 sm:px-4 sm:py-1 font-semibold text-slate-700 min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px]">ディナー</td>
                      {dates.map(date => {
                        let dinnerCount = 0;
                        staffData.forEach(staff => {
                          const shift = staff.shifts[date];
                          if (!shift || !shift.isWorking) return;
                          if (shift.isAllDay) {
                            dinnerCount++;
                            return;
                          }
                          // 時間帯がディナー（16:00-22:00）に少しでもかぶっていればカウント
                          const start = shift.startTime ? parseInt(shift.startTime.replace(':', ''), 10) : null;
                          const end = shift.endTime ? parseInt(shift.endTime.replace(':', ''), 10) : null;
                          if (start !== null && end !== null) {
                            // 1600〜2200の間に少しでも勤務していればOK
                            if (!(end <= 1600 || start >= 2200)) {
                              dinnerCount++;
                            }
                          }
                        });
                        return (
                          <td key={date} className="px-1 py-1 sm:px-4 sm:py-1 text-center font-medium text-slate-600 bg-white text-[10px] sm:text-xs min-w-[36px] w-[36px] sm:min-w-[100px] sm:w-[100px]">{dinnerCount}</td>
                        );
                      })}
                      <td className="min-w-[80px] w-[80px] sm:min-w-[100px] sm:w-[100px] bg-white"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                ※横にスクロールしてもスタッフ名と確定状態は固定されます
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="mt-2 text-sky-600">スタッフデータがありません</p>
            </div>
          )}
          
          <div className="mt-6 space-y-1 text-sm text-sky-600">
            <p className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              セルをクリックしてシフトを編集できます
            </p>
            <p className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              「確定済み」はスタッフがシフト希望を確定したことを示します
            </p>
          </div>
        </div>

        {/* グループ情報セクション */}
        <div className="bg-white rounded-xl shadow-md border border-sky-100 p-6 mt-6">
          <h2 className="text-xl font-semibold text-sky-800 mb-6">グループ情報</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-sky-700 mb-2">アクセスキー</h3>
              <div className="bg-sky-50 rounded-lg p-4 flex items-center justify-between">
                <code className="font-mono text-sm text-sky-800 break-all">{group.accessKey}</code>
                <button
                  onClick={copyAccessKeyToClipboard}
                  className="ml-4 inline-flex items-center px-3 py-1 border border-transparent rounded-lg shadow-sm text-sm font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-200"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copyAccessKeySuccess || 'コピー'}
                </button>
              </div>
              <p className="mt-2 text-sm text-sky-600">
                このキーを共有して、メンバーをグループに招待できます。
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-sky-700 mb-2">管理者キー</h3>
              <div className="bg-sky-50 rounded-lg p-4 flex items-center justify-between">
                <code className="font-mono text-sm text-sky-800 break-all">{group.adminKey}</code>
                <button
                  onClick={copyAdminKeyToClipboard}
                  className="ml-4 inline-flex items-center px-3 py-1 border border-transparent rounded-lg shadow-sm text-sm font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-200"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copyAdminKeySuccess || 'コピー'}
                </button>
              </div>
              <p className="mt-2 text-sm text-sky-600">
                このキーは管理者専用です。安全に保管してください。
              </p>
            </div>
          </div>
        </div>

        {/* スタッフ追加フォーム */}
        <div className="bg-white rounded-xl shadow-md border border-sky-100 p-6 mt-6">
          <h2 className="text-xl font-semibold text-sky-800 mb-4">スタッフ追加</h2>
          <form onSubmit={handleAddStaff} className="flex items-end gap-4">
            <div className="flex-grow">
              <label htmlFor="newStaffName" className="block text-sm font-medium text-sky-700 mb-1">
                スタッフ名
              </label>
              <input
                id="newStaffName"
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full px-4 py-2 border border-sky-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition duration-200"
                placeholder="新しいスタッフの名前"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newStaffName.trim()}
              className={`
                inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-md
                text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
                transition-colors duration-200
                ${loading || !newStaffName.trim() ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  追加中...
                </>
              ) : '追加'}
            </button>
          </form>
        </div>

        {/* スタッフ管理セクション */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-sky-800 mb-6">スタッフ管理</h2>
          {staffData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-green-100">
              <table className="min-w-full divide-y divide-green-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-green-50 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                      スタッフ名
                    </th>
                    <th className="px-4 py-3 bg-green-50 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                      状態
                    </th>
                    <th className="px-4 py-3 bg-green-50 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {staffData.map((staff) => (
                    <tr key={`staff-management-${staff.staff_id}`} className="hover:bg-green-50 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-800">
                        {staff.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {staff.isConfirmed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            確定済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                            未確定
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteStaff(staff.staff_id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="mt-2 text-sky-600">スタッフデータがありません</p>
            </div>
          )}
        </div>
      </main>
      
      <div className="mt-6 text-center text-xs text-sky-500 pb-6">
        <p>© 2025 シフト作成アプリ All Rights Reserved.</p>
      </div>

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
  );
} 