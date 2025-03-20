'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/contexts/GroupContext';
import { useShiftApi, useStaffApi } from '@/hooks/useApi';
import { ShiftData, ShiftInfo } from '@/types';
import { formatDisplayDate } from '@/utils/helpers';
import ShiftModal from '@/components/ShiftModal';

// APIエラー型の定義
interface ApiError {
  message: string;
  status?: number;
}

export default function GroupPage() {
  const router = useRouter();
  const { group, leaveGroup } = useGroup();
  const shiftApi = useShiftApi();
  const staffApi = useStaffApi();
  
  const [staffName, setStaffName] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Record<string, ShiftInfo>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [existingStaff, setExistingStaff] = useState<ShiftData[]>([]);
  const [selectedExistingStaffId, setSelectedExistingStaffId] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isShiftConfirmed, setIsShiftConfirmed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showStaffSelection, setShowStaffSelection] = useState(true);
  
  // グループ情報がない場合はトップページにリダイレクト
  useEffect(() => {
    if (!group) {
      router.push('/');
    }
  }, [group, router]);
  
  // 初期データの読み込み
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!group) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // 日付範囲を取得
        // まずはデータベースから日付範囲を取得
        const dateRangeResponse = await shiftApi.getDateRange(group.groupId);
        
        if (dateRangeResponse.success && dateRangeResponse.data) {
          // 保存された日付範囲を使用
          const { startDate: savedStartDate, days } = dateRangeResponse.data;
          const datesResponse = await shiftApi.getDates(new Date(savedStartDate), days);
          if (datesResponse.success && Array.isArray(datesResponse.data)) {
            setDates(datesResponse.data);
          }
        } else {
          // 保存された日付範囲がない場合はデフォルト値を使用
          const datesResponse = await shiftApi.getDates();
          if (datesResponse.success && Array.isArray(datesResponse.data)) {
            setDates(datesResponse.data);
          }
        }
        
        // スタッフ一覧を取得
        const staffResponse = await staffApi.getStaffList();
        if (staffResponse.success && Array.isArray(staffResponse.data)) {
          setExistingStaff(staffResponse.data);
        }
        
        // ローカルストレージからスタッフ情報を取得
        const storedStaffId = localStorage.getItem(`staffId_${group.groupId}`);
        const storedStaffName = localStorage.getItem(`staffName_${group.groupId}`);
        
        if (storedStaffId && storedStaffName) {
          setStaffId(storedStaffId);
          setStaffName(storedStaffName);
          
          const confirmResponse = await shiftApi.getShiftConfirmation(storedStaffId);
          if (confirmResponse.success && confirmResponse.data) {
            setIsShiftConfirmed(confirmResponse.data.isConfirmed);
            localStorage.setItem(`shiftConfirmed_${group.groupId}_${storedStaffId}_individual`, 
              confirmResponse.data.isConfirmed ? 'true' : 'false');
          }
          
          const shiftsResponse = await shiftApi.getStaffShifts(storedStaffId);
          if (shiftsResponse.success && shiftsResponse.data) {
            setShifts(shiftsResponse.data);
          }
          
          setShowStaffSelection(false);
        }
        
        setLoading(false);
      } catch (error) {
        const apiError = error as ApiError;
        setError(apiError.message || 'データの読み込みに失敗しました');
        console.error('データ読み込みエラー:', apiError);
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [group?.groupId, shiftApi]); // shiftApiを依存配列に追加
  
  // 既存のスタッフを選択
  const handleSelectExistingStaff = async () => {
    if (!selectedExistingStaffId || !group) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await staffApi.getStaff(selectedExistingStaffId);
      
      if (response.success && response.data) {
        const staffData = response.data as ShiftData;
        
        let actualStaffId = '';
        if (staffData.id) {
          actualStaffId = staffData.id;
        } else if (staffData.staff_id) {
          actualStaffId = staffData.staff_id;
        } else {
          setError('スタッフIDが見つかりません');
          setLoading(false);
          return;
        }
        
        setStaffId(actualStaffId);
        setStaffName(staffData.name);
        
        localStorage.setItem(`staffId_${group.groupId}`, actualStaffId);
        localStorage.setItem(`staffName_${group.groupId}`, staffData.name);
        
        const confirmResponse = await shiftApi.getShiftConfirmation(actualStaffId);
        
        if (confirmResponse.success && confirmResponse.data) {
          setIsShiftConfirmed(confirmResponse.data.isConfirmed);
          localStorage.setItem(`shiftConfirmed_${group.groupId}_${actualStaffId}_individual`, 
            confirmResponse.data.isConfirmed ? 'true' : 'false');
        } else {
          setIsShiftConfirmed(false);
        }
        
        const shiftsResponse = await shiftApi.getStaffShifts(actualStaffId);
        
        if (shiftsResponse.success && shiftsResponse.data) {
          setShifts(shiftsResponse.data as Record<string, ShiftInfo>);
        } else {
          setShifts({});
        }
        
        setShowStaffSelection(false);
      } else {
        setError(response.error || 'スタッフの取得に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('スタッフ選択エラー:', apiError);
      setError(apiError.message || 'スタッフの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  // シフトセルがクリックされたときの処理
  const handleCellClick = (date: string) => {
    setSelectedDate(date);
    setModalOpen(true);
  };
  
  // シフト情報が保存されたときの処理
  const handleShiftSave = async (shiftInfo: ShiftInfo) => {
    if (!staffId || !selectedDate) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const completeShiftInfo: ShiftInfo = {
        ...shiftInfo,
        staff_id: staffId,
        date: selectedDate
      };
      
      const result = await shiftApi.updateShift(staffId, selectedDate, completeShiftInfo);
      
      if (result) {
        setShifts(prev => ({
          ...prev,
          [selectedDate]: {
            ...completeShiftInfo,
            staff_id: staffId,
            date: selectedDate
          }
        }));
        
        setModalOpen(false);
      } else {
        setError('シフトの更新に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('シフト更新エラー:', apiError);
      setError(apiError.message || 'シフトの更新中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  // アクセスキーをクリップボードにコピー
  const copyAccessKeyToClipboard = () => {
    if (!group?.accessKey) return;
    
    navigator.clipboard.writeText(group.accessKey)
      .then(() => {
        setCopySuccess('コピーしました！');
        setTimeout(() => setCopySuccess(null), 2000);
      })
      .catch(() => {
        setCopySuccess('コピーに失敗しました');
        setTimeout(() => setCopySuccess(null), 2000);
      });
  };
  
  // シフト確定の処理
  const handleConfirmShift = () => {
    if (!staffId || !group) return;
    
    // 確認ダイアログを表示
    setShowConfirmDialog(true);
  };
  
  // シフト確定を実行
  const executeConfirmShift = async () => {
    if (!staffId || !group) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await shiftApi.confirmShift(staffId);
      
      if (response.success && response.data) {
        setIsShiftConfirmed(response.data.isConfirmed);
        
        localStorage.setItem(`shiftConfirmed_${group.groupId}_${staffId}_individual`, 
          response.data.isConfirmed ? 'true' : 'false');
          
        setShowConfirmDialog(false);
      } else {
        setError(response.error || 'シフトの確定に失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'シフトの確定中にエラーが発生しました');
      console.error('シフト確定エラー:', apiError);
    } finally {
      setLoading(false);
    }
  };
  
  // シフト確定を取り消し
  const cancelConfirmShift = async () => {
    if (!staffId || !group) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await shiftApi.unconfirmShift(staffId);
      
      if (response.success && response.data) {
        setIsShiftConfirmed(response.data.isConfirmed);
        
        localStorage.setItem(`shiftConfirmed_${group.groupId}_${staffId}_individual`, 
          response.data.isConfirmed ? 'true' : 'false');
      } else {
        setError(response.error || 'シフト確定の取り消しに失敗しました');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'シフト確定の取り消し中にエラーが発生しました');
      console.error('シフト確定の取り消しエラー:', apiError);
    } finally {
      setLoading(false);
    }
  };
  
  // リダイレクト中の表示
  if (!group) {
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
        <p className="text-gray-600 mt-2">グループ: {group.groupName}</p>
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
        
        {showStaffSelection ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">スタッフを選択してください</h2>
            <p className="text-gray-600 mb-4">
              シフト希望を入力するために、あなたの名前を選択してください。
            </p>
            
            {existingStaff.length > 0 ? (
              <div>
                <label htmlFor="existingStaff" className="block text-sm font-medium text-gray-700">
                  スタッフを選択
                </label>
                <div className="mt-1">
                  <select
                    id="existingStaff"
                    name="existingStaff"
                    value={selectedExistingStaffId}
                    onChange={(e) => setSelectedExistingStaffId(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {existingStaff.map((staff) => {
                      // staff.id がある場合はそれを使用、なければ staff_id を使用
                      const staffId = staff.id || staff.staff_id;
                      return (
                        <option key={staffId} value={staffId}>
                          {staff.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleSelectExistingStaff}
                    disabled={loading || !selectedExistingStaffId}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      loading || !selectedExistingStaffId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? '処理中...' : '選択して続ける'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">
                  登録されているスタッフがありません。管理者にスタッフ登録を依頼してください。
                </p>
                <p className="text-gray-500 mt-2">
                  または、管理者キーを使って管理者としてアクセスしてください。
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  トップページに戻る
                </button>
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                ※スタッフの登録は管理者のみが行えます。あなたの名前が表示されない場合は、管理者に連絡してください。
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">シフト希望入力</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // スタッフ選択画面に戻る
                    setShowStaffSelection(true);
                    
                    // 現在のスタッフの情報を削除
                    if (staffId && group) {
                      localStorage.removeItem(`staffId_${group.groupId}`);
                      localStorage.removeItem(`staffName_${group.groupId}`);
                      localStorage.removeItem(`shiftConfirmed_${group.groupId}_${staffId}_individual`);
                      setStaffId(null);
                      setStaffName('');
                      setShifts({});
                      setIsShiftConfirmed(false);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  メンバーを変更
                </button>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              <span className="font-medium">{staffName}</span>さん、シフト希望を入力してください。
            </p>
            
            {isShiftConfirmed && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 font-medium">シフト希望が確定されています</p>
                    <p className="text-sm text-green-600 mt-1">
                      シフト希望を変更する場合は、確定を取り消してください。
                    </p>
                  </div>
                  <button
                    onClick={cancelConfirmShift}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    確定を取り消す
                  </button>
                </div>
              </div>
            )}
            
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
                      let cellContent = '未設定';
                      let cellClass = 'bg-gray-100 text-gray-500';
                      
                      if (shift) {
                        if (shift.isWorking) {
                          cellContent = `${shift.startTime} - ${shift.endTime}`;
                          cellClass = 'bg-green-100 text-green-800';
                        } else {
                          cellContent = '休み';
                          cellClass = 'bg-red-100 text-red-800';
                        }
                      }
                      
                      return (
                        <tr key={date} onClick={() => !isShiftConfirmed && handleCellClick(date)} className={`${!isShiftConfirmed ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                          <td className="px-4 py-2 border border-gray-200">{formatDisplayDate(date)}</td>
                          <td className={`px-4 py-2 border border-gray-200 ${cellClass}`}>
                            {cellContent}
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
                日付データがありません
              </p>
            )}
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>※セルをクリックしてシフトを編集できます</p>
              </div>
              
              {!isShiftConfirmed && Object.keys(shifts).length > 0 && (
                <button
                  onClick={handleConfirmShift}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  シフト希望を確定する
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-4 mt-6">
          <h2 className="text-xl font-bold mb-4">お知らせ</h2>
          <p className="text-gray-600">
            シフトに関する質問や変更依頼は管理者にお問い合わせください。
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                このグループのアクセスキー: <span className="font-mono font-medium">{group.accessKey}</span>
              </p>
              <button
                onClick={copyAccessKeyToClipboard}
                className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {copySuccess || 'コピー'}
              </button>
            </div>
            <p className="text-sm mt-2">
              このキーを共有して、他のメンバーをグループに招待できます。
            </p>
          </div>
        </div>
      </main>
      
      {staffId && (
        <>
          <ShiftModal 
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleShiftSave}
            staffName={staffName}
            date={selectedDate}
            currentShift={shifts[selectedDate]}
          />
          
          {/* シフト確定確認ダイアログ */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">シフト希望の確定</h3>
                <p className="text-gray-700 mb-4">
                  シフト希望を確定しますか？確定後は管理者がシフトを確認できるようになります。
                </p>
                <p className="text-gray-700 mb-6">
                  確定後もシフトの変更は可能ですが、管理者に変更した旨を連絡することをおすすめします。
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeConfirmShift}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    確定する
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 