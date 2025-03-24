import { useState, useCallback, useRef } from 'react';
import { ApiResponse, ShiftData, ShiftInfo } from '@/types';
import { staffService, shiftService } from '@/services/supabaseService';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  // 共通のAPI呼び出し関数
  const callApi = useCallback(async <R>(
    apiFunction: () => Promise<R>
  ): Promise<ApiResponse<R>> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await apiFunction();

      setState({
        data: result as unknown as T,
        loading: false,
        error: null
      });

      return {
        success: true,
        data: result
      };
    } catch (error: unknown) {
      console.error('API Error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '予期せぬエラーが発生しました'
      }));

      return {
        success: false,
        error: error instanceof Error ? error.message : '予期せぬエラーが発生しました'
      };
    }
  }, []);

  return {
    ...state,
    callApi
  };
}

// スタッフ関連のAPI呼び出し用フック
export function useStaffApi() {
  const api = useApi<ShiftData | ShiftData[]>();

  // スタッフ一覧を取得
  const getStaffList = useCallback((groupId?: string) => {
    return api.callApi(() => staffService.getStaffList(groupId));
  }, [api]);

  // 特定のスタッフを取得
  const getStaff = useCallback((id: string) => {
    console.log('useStaffApi.getStaff呼び出し:', { id, type: typeof id });
    return api.callApi(() => staffService.getStaff(id));
  }, [api]);

  // スタッフを追加
  const addStaff = useCallback((name: string, groupId?: string) => {
    return api.callApi(() => staffService.addStaff(name, groupId));
  }, [api]);

  // スタッフ情報を更新
  const updateStaff = useCallback((id: string, name: string) => {
    return api.callApi(() => staffService.updateStaff(id, name));
  }, [api]);

  // スタッフを削除
  const deleteStaff = useCallback((id: string) => {
    return api.callApi(() => staffService.deleteStaff(id));
  }, [api]);

  return {
    ...api,
    getStaffList,
    getStaff,
    addStaff,
    updateStaff,
    deleteStaff
  };
}

// シフト関連のAPI呼び出し用フック
export function useShiftApi() {
  const api = useApi<ShiftInfo | string[]>();
  const confirmationCache = useRef<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  // 日付一覧を取得
  const getDates = useCallback(async (startDate?: Date, days: number = 14) => {
    try {
      const start = startDate || new Date();
      const dates: string[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      return { success: true, data: dates };
    } catch (error: unknown) {
      console.error('日付データの取得エラー:', error);
      setError('日付データの取得に失敗しました');
      return { success: false, error: '日付データの取得に失敗しました' };
    }
  }, []);
  
  // 特定の日付のシフト情報を取得
  const getShift = useCallback((staffId: string, date: string) => {
    return api.callApi(() => shiftService.getShift(staffId, date));
  }, [api]);
  
  // シフト情報を更新
  const updateShift = useCallback(async (staffId: string, date: string, shiftInfo: ShiftInfo): Promise<ShiftInfo | null> => {
    try {
      console.log('API呼び出し - updateShift:', { staffId, date, shiftInfo });
      
      if (!staffId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId)) {
        throw new Error(`無効なスタッフID: ${staffId}`);
      }
      
      const completeShiftInfo: ShiftInfo = {
        ...shiftInfo,
        staff_id: staffId,
        date: date
      };
      
      try {
        const result = await shiftService.updateShift(completeShiftInfo);
        console.log('シフト更新成功:', result);
        return result;
      } catch (error: unknown) {
        console.error('シフト更新サービスエラー:', error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error);
        throw error;
      }
    } catch (error: unknown) {
      console.error('シフト更新エラー:', error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error);
      
      const errorMessage = error instanceof Error ? error.message : 'シフト情報の更新に失敗しました';
      setError(errorMessage);
      return null;
    }
  }, []);
  
  // シフト情報を削除
  const deleteShift = useCallback((staffId: string, date: string) => {
    return api.callApi(() => shiftService.deleteShift(staffId, date));
  }, [api]);
  
  // スタッフのすべてのシフト情報を取得
  const getStaffShifts = useCallback((staffId: string) => {
    return api.callApi(() => shiftService.getStaffShifts(staffId));
  }, [api]);
  
  // 日付範囲を保存
  const saveDateRange = useCallback(async (groupId: string, startDate: string, days: number) => {
    try {
      // データベースに保存
      try {
        await shiftService.saveDateRange(groupId, startDate, days);
      } catch (dbError) {
        console.warn('データベースへの日付範囲保存に失敗:', dbError);
      }
      
      // ローカルストレージにも保存（バックアップ）
      localStorage.setItem(`dateRange_${groupId}`, JSON.stringify({ startDate, days }));
      
      return { success: true, data: true };
    } catch (error: unknown) {
      console.error('日付範囲の保存エラー:', error);
      setError('日付範囲の保存に失敗しました');
      return { success: false, error: '日付範囲の保存に失敗しました' };
    }
  }, []);
  
  // 日付範囲を取得
  const getDateRange = useCallback(async (groupId: string) => {
    try {
      // まずデータベースから日付範囲を取得
      try {
        const response = await shiftService.getDateRange(groupId);
        if (response) {
          return { success: true, data: response };
        }
      } catch (dbError) {
        console.warn('データベースからの日付範囲取得に失敗:', dbError);
        // データベース取得失敗時はローカルストレージを試す
      }
      
      // データベースからの取得に失敗した場合、ローカルストレージから取得
      const savedRange = localStorage.getItem(`dateRange_${groupId}`);
      
      if (savedRange) {
        return { success: true, data: JSON.parse(savedRange) };
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.error('日付範囲の取得エラー:', error);
      setError('日付範囲の取得に失敗しました');
      return { success: false, error: '日付範囲の取得に失敗しました' };
    }
  }, []);
  
  // 過去のシフト期間を取得
  const getPastShifts = useCallback(async (groupId: string) => {
    try {
      const pastShiftsKey = `pastShifts_${groupId}`;
      const savedPastShifts = localStorage.getItem(pastShiftsKey);
      
      if (savedPastShifts) {
        return { success: true, data: JSON.parse(savedPastShifts) };
      }
      
      return { success: true, data: [] };
    } catch (error: unknown) {
      console.error('過去のシフト期間の取得エラー:', error);
      setError('過去のシフト期間の取得に失敗しました');
      return { success: false, error: '過去のシフト期間の取得に失敗しました' };
    }
  }, []);
  
  // 現在のシフト期間を過去のシフトに移動し、削除する
  const archiveCurrentShift = useCallback(async (groupId: string) => {
    try {
      const currentRangeResponse = await getDateRange(groupId);
      if (!currentRangeResponse.success || !currentRangeResponse.data) {
        return { success: false, error: '現在のシフト期間が見つかりません' };
      }
      
      const currentRange = currentRangeResponse.data;
      const pastShiftsResponse = await getPastShifts(groupId);
      const pastShifts = pastShiftsResponse.success && pastShiftsResponse.data 
        ? pastShiftsResponse.data 
        : [];
      
      pastShifts.push(currentRange);
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(pastShifts));
      
      return { success: true, data: true };
    } catch (error: unknown) {
      console.error('シフト期間のアーカイブエラー:', error);
      setError('シフト期間のアーカイブに失敗しました');
      return { success: false, error: 'シフト期間のアーカイブに失敗しました' };
    }
  }, [getDateRange, getPastShifts]);
  
  // 過去のシフト期間を削除
  const deletePastShift = useCallback(async (groupId: string, startDate: string) => {
    try {
      const pastShiftsResponse = await getPastShifts(groupId);
      if (!pastShiftsResponse.success || !pastShiftsResponse.data) {
        return { success: false, error: '過去のシフト期間が見つかりません' };
      }
      
      const updatedPastShifts = pastShiftsResponse.data.filter(
        (shift: { startDate: string; days: number }) => shift.startDate !== startDate
      );
      
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(updatedPastShifts));
      
      return { success: true, data: true };
    } catch (error: unknown) {
      console.error('過去のシフト期間の削除エラー:', error);
      setError('過去のシフト期間の削除に失敗しました');
      return { success: false, error: '過去のシフト期間の削除に失敗しました' };
    }
  }, [getPastShifts]);
  
  // 6週間以上前のシフトデータを削除
  const cleanupOldShifts = useCallback(async () => {
    try {
      const response = await api.callApi(() => shiftService.cleanupOldShifts());
      return response;
    } catch (error: unknown) {
      console.error('古いシフトデータの削除エラー:', error);
      setError('古いシフトデータの削除に失敗しました');
      return { success: false, error: '古いシフトデータの削除に失敗しました' };
    }
  }, [api]);

  // シフト確定状態を取得
  const getShiftConfirmation = useCallback(async (staffId: string) => {
    // キャッシュをチェック
    if (confirmationCache.current[staffId] !== undefined) {
      return {
        success: true,
        data: { isConfirmed: confirmationCache.current[staffId] }
      };
    }

    try {
      const response = await shiftService.getShiftConfirmation(staffId);
      
      // キャッシュを更新
      if (response.success && response.data) {
        confirmationCache.current[staffId] = response.data.isConfirmed;
      }
      
      return response;
    } catch (error: unknown) {
      console.error('シフト確定状態の取得に失敗しました:', error);
      return { success: false, error: '確定状態の取得に失敗しました' };
    }
  }, []);

  // シフトを確定
  const confirmShift = useCallback(async (staffId: string) => {
    try {
      const response = await shiftService.confirmShift(staffId);
      
      // キャッシュを更新
      if (response.success && response.data) {
        confirmationCache.current[staffId] = true;
      }
      
      return response;
    } catch (error: unknown) {
      console.error('シフト確定に失敗しました:', error);
      return { success: false, error: 'シフト確定に失敗しました' };
    }
  }, []);

  // シフト確定を取り消し
  const unconfirmShift = useCallback(async (staffId: string) => {
    try {
      const response = await shiftService.unconfirmShift(staffId);
      
      // キャッシュを更新
      if (response.success && response.data) {
        confirmationCache.current[staffId] = false;
      }
      
      return response;
    } catch (error: unknown) {
      console.error('シフト確定解除に失敗しました:', error);
      return { success: false, error: 'シフト確定解除に失敗しました' };
    }
  }, []);

  // スタッフの全シフトを一括で更新
  const updateStaffShifts = useCallback(async (staffId: string, isWorking: boolean, specificDates?: string[]) => {
    try {
      console.log(`API Hookからの一括更新開始: staffId=${staffId}, isWorking=${isWorking}, 日付指定=${specificDates ? specificDates.length + '日分' : 'なし'}`);
      
      const result = await shiftService.updateStaffShifts(staffId, isWorking, specificDates);
      console.log(`一括更新結果: ${result ? '成功' : '失敗'}`);
      
      return { 
        success: result, 
        data: result, 
        error: result ? undefined : 'シフトの一括更新に失敗しました' 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('スタッフの全シフト一括更新エラー:', error);
      console.error('エラー詳細:', errorMessage);
      setError('スタッフの全シフト一括更新に失敗しました');
      return { 
        success: false, 
        error: `スタッフの全シフト一括更新に失敗しました: ${errorMessage}` 
      };
    }
  }, []);

  return {
    getDates,
    getShift,
    getStaffShifts,
    updateShift,
    deleteShift,
    saveDateRange,
    getDateRange,
    getPastShifts,
    archiveCurrentShift,
    deletePastShift,
    cleanupOldShifts,
    getShiftConfirmation,
    confirmShift,
    unconfirmShift,
    updateStaffShifts,
    loading: api.loading,
    error: api.error || error
  };
} 