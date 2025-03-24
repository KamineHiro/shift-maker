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
    let isSubscribed = true;
    if (!group?.groupId) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 日付範囲とスタッフ一覧を並列で取得
        const [dateRangeResponse, staffResponse] = await Promise.all([
          shiftApi.getDateRange(group.groupId),
          staffApi.getStaffList(group.groupId)
        ]);

        // 日付データの処理
        if (isSubscribed && dateRangeResponse.success && dateRangeResponse.data) {
          // 保存された日付範囲を使用
          const { startDate: savedStartDate, days } = dateRangeResponse.data;
          const datesResponse = await shiftApi.getDates(new Date(savedStartDate), days);
          if (isSubscribed && datesResponse.success && Array.isArray(datesResponse.data)) {
            setDates(datesResponse.data);
          }
        } else if (isSubscribed) {
          // 保存された日付範囲がない場合はデフォルト値を使用
          const datesResponse = await shiftApi.getDates();
          if (isSubscribed && datesResponse.success && Array.isArray(datesResponse.data)) {
            setDates(datesResponse.data);
          }
        }

        // スタッフデータの処理
        if (isSubscribed && staffResponse.success && Array.isArray(staffResponse.data)) {
          // グループIDに一致するスタッフのみが返されるはず
          console.log(`グループID: ${group.groupId}のスタッフを表示します`);
          console.log(`取得したスタッフ: ${staffResponse.data.length}人`);
          
          if (staffResponse.data.length === 0) {
            console.warn(`グループID: ${group.groupId}に登録されているスタッフが見つかりません`);
          }
          
          setExistingStaff(staffResponse.data);
        } else if (isSubscribed) {
          console.error('スタッフデータの取得に失敗:', staffResponse.error);
          setExistingStaff([]);
        }

        // ローカルストレージからスタッフ情報を取得
        if (isSubscribed) {
          const storedStaffId = localStorage.getItem(`staffId_${group.groupId}`);
          const storedStaffName = localStorage.getItem(`staffName_${group.groupId}`);
          
          if (storedStaffId && storedStaffName) {
            // 現在の値と異なる場合のみ更新
            setStaffId((prev) => (prev === storedStaffId ? prev : storedStaffId));
            setStaffName((prev) => (prev === storedStaffName ? prev : storedStaffName));
            
            // 確定状態とシフトデータを並列で取得
            const [confirmResponse, shiftsResponse] = await Promise.all([
              shiftApi.getShiftConfirmation(storedStaffId),
              shiftApi.getStaffShifts(storedStaffId)
            ]);
            
            if (isSubscribed && confirmResponse.success && confirmResponse.data) {
              setIsShiftConfirmed(confirmResponse.data.isConfirmed);
              localStorage.setItem(`shiftConfirmed_${group.groupId}_${storedStaffId}_individual`, 
                confirmResponse.data.isConfirmed ? 'true' : 'false');
            }
            
            if (isSubscribed && shiftsResponse.success && shiftsResponse.data) {
              setShifts(shiftsResponse.data);
            }
            
            if (isSubscribed) {
              setShowStaffSelection(false);
            }
          }
        }
        
        if (isSubscribed) {
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          const apiError = error as ApiError;
          setError(apiError.message || 'データの読み込みに失敗しました');
          console.error('データ読み込みエラー:', apiError);
          setLoading(false);
        }
      }
    };
    
    fetchInitialData();
    
    return () => {
      isSubscribed = false;
    };
  }, [group?.groupId]); // shiftApiとstaffApiを依存配列から削除
  
  // 既存のスタッフを選択
  const handleSelectExistingStaff = async () => {
    if (!selectedExistingStaffId || !group) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 選択されたスタッフが現在のグループに所属していることを確認
      // まず選択されたスタッフIDが現在のexistingStaffリストに含まれているか確認
      const isStaffInCurrentGroup = existingStaff.some(staff => {
        const staffId = staff.id || staff.staff_id;
        return staffId === selectedExistingStaffId;
      });
      
      if (!isStaffInCurrentGroup) {
        setError(`セキュリティエラー: 選択されたスタッフは現在のグループに所属していません`);
        console.error(`セキュリティ警告: グループ ${group.groupId} に所属していないスタッフ ${selectedExistingStaffId} の選択が試みられました`);
        setLoading(false);
        return;
      }
      
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
  
  // すべての日程を一括で更新する関数
  const handleBulkShiftUpdate = async (isWorking: boolean) => {
    if (!staffId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 確認ダイアログを表示
      const actionType = isWorking ? '全日勤務可能' : '休み';
      const confirmed = confirm(`すべての日程を「${actionType}」に一括設定しますか？\nこの操作は元に戻せません。`);
      
      if (!confirmed) {
        setLoading(false);
        return;
      }
      
      // 処理中メッセージを表示
      setError(isWorking ? '全日程を勤務可能に設定中...' : '全日程を休みに設定中...');
      
      // 現在表示されている日付を使用
      console.log(`一括更新を開始: staffId=${staffId}, isWorking=${isWorking}, 日付数=${dates.length}`);
      console.log('対象日付:', dates);
      
      // 現在表示されている日付範囲を使用して更新を実行
      const response = await shiftApi.updateStaffShifts(staffId, isWorking, dates);
      console.log('一括更新のレスポンス:', response);
      
      if (response.success) {
        // 成功メッセージを表示
        const actionMsg = isWorking ? '「全日勤務可能」' : '「休み」';
        setError(`全日程を${actionMsg}に設定しました！`);
        
        // シフトデータを再取得（最大3回まで試行）
        let retryCount = 0;
        let shiftsUpdated = false;
        
        // 少し長めの待機時間（まず1秒待つ）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        while (retryCount < 3 && !shiftsUpdated) {
          try {
            console.log(`シフトデータ再取得: 試行 ${retryCount + 1}`);
            
            // 再取得前に段階的に長く待機（DB更新のタイムラグ対策）
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            
            const shiftsResponse = await shiftApi.getStaffShifts(staffId);
            console.log('再取得レスポンス:', shiftsResponse);
            
            if (shiftsResponse.success && shiftsResponse.data) {
              // データの検証（すべての日程が更新されているか確認）
              const newShifts = shiftsResponse.data as Record<string, ShiftInfo>;
              console.log(`取得したシフト数: ${Object.keys(newShifts).length}`);
              
              // 全日程の中から一部をサンプルとして抽出してログ出力
              const shiftDates = Object.keys(newShifts).sort();
              
              if (shiftDates.length > 0) {
                const firstDate = shiftDates[0];
                const lastDate = shiftDates[shiftDates.length - 1];
                const middleDate = shiftDates[Math.floor(shiftDates.length / 2)];
                
                console.log(`最初の日付 ${firstDate} のシフト:`, newShifts[firstDate]);
                if (middleDate) console.log(`中間の日付 ${middleDate} のシフト:`, newShifts[middleDate]);
                console.log(`最後の日付 ${lastDate} のシフト:`, newShifts[lastDate]);
                
                // 表示されている日付に対してのみ検証
                const updatedCount = dates.filter(date => 
                  newShifts[date] && newShifts[date].isWorking === isWorking
                ).length;
                
                console.log(`更新された日付数: ${updatedCount}/${dates.length}`);
                
                if (updatedCount === 0) {
                  console.warn('更新された日付が見つかりません。再試行します...');
                  retryCount++;
                  continue;
                }
              }
              
              setShifts(newShifts);
              shiftsUpdated = true;
              console.log('シフトデータを正常に更新しました');
            } else {
              console.warn('シフトデータの再取得に失敗:', shiftsResponse.error);
            }
          } catch (fetchError) {
            console.error(`シフトデータの再取得に失敗 (試行 ${retryCount + 1}):`, fetchError);
          }
          
          retryCount++;
        }
        
        if (!shiftsUpdated) {
          console.error('シフトデータの再取得に失敗しました。ページを再読み込みしてください。');
          // 自動リロードを案内
          setError(`全日程を${actionMsg}に設定しました！データを更新するには画面をリロードしてください。`);
        }
        
        // 成功メッセージを5秒後に消す
        setTimeout(() => {
          setError(null);
        }, 5000); // 5秒に延長
      } else {
        setError(response.error || 'シフトの一括更新に失敗しました');
        console.error('一括更新エラー:', response.error);
        // エラーメッセージを5秒後に消す
        setTimeout(() => {
          setError(null);
        }, 5000);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.message || 'シフトの一括更新に失敗しました');
      console.error('シフト一括更新エラー:', apiError);
      // エラーメッセージを5秒後に消す
      setTimeout(() => {
        setError(null);
      }, 5000);
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
          <div className={`px-4 py-3 rounded mb-4 flex items-center justify-between ${
            error.includes('設定中...') 
              ? 'bg-blue-100 border border-blue-400 text-blue-700' 
              : error.includes('設定しました') 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            <div className="flex items-center">
              {error.includes('設定中...') && (
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {error.includes('設定しました') && (
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <p>{error}</p>
            </div>
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
            
            {/* 一括設定ボタン */}
            {!loading && dates.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-3 sm:mb-0 sm:mr-2">クイック設定:</div>
                <div className="flex flex-wrap w-full sm:w-auto space-y-2 sm:space-y-0 space-x-0 sm:space-x-3">
                  <button
                    onClick={() => handleBulkShiftUpdate(false)}
                    className="w-full sm:w-auto px-4 py-3 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200 text-sm font-medium border border-red-200 flex items-center justify-center"
                    disabled={loading}
                  >
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    全て休みに設定
                  </button>
                  <button
                    onClick={() => handleBulkShiftUpdate(true)}
                    className="w-full sm:w-auto px-4 py-3 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200 text-sm font-medium border border-green-200 flex items-center justify-center"
                    disabled={loading}
                  >
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    全て全日勤務可に設定
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