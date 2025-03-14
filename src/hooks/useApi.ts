import { useState, useCallback } from 'react';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
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
  const [error, setError] = useState<string | null>(null);
  
  // 日付一覧を取得
  const getDates = useCallback(async (startDate?: Date, days: number = 14) => {
    try {
      // 開始日が指定されていない場合は今日から
      const start = startDate || new Date();
      const dates: string[] = [];
      
      // 指定された日数分の日付を生成
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      return { success: true, data: dates };
    } catch (err) {
      setError('日付データの取得に失敗しました');
      return { success: false, error: '日付データの取得に失敗しました' };
    }
  }, []);
  
  // 特定の日付のシフト情報を取得
  const getShift = useCallback((staffId: string, date: string) => {
    return api.callApi(() => shiftService.getShift(staffId, date));
  }, [api]);
  
  // シフト情報を更新
  const updateShift = useCallback((staffId: string, date: string, shiftInfo: ShiftInfo) => {
    return api.callApi(() => shiftService.updateShift(staffId, date, shiftInfo));
  }, [api]);
  
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
      // ローカルストレージに保存
      localStorage.setItem(`dateRange_${groupId}`, JSON.stringify({ startDate, days }));
      
      return { success: true, data: true };
    } catch (err) {
      setError('日付範囲の保存に失敗しました');
      return { success: false, error: '日付範囲の保存に失敗しました' };
    }
  }, []);
  
  // 日付範囲を取得
  const getDateRange = useCallback(async (groupId: string) => {
    try {
      // ローカルストレージから取得
      const savedRange = localStorage.getItem(`dateRange_${groupId}`);
      
      if (savedRange) {
        return { success: true, data: JSON.parse(savedRange) };
      }
      
      return { success: false };
    } catch (err) {
      setError('日付範囲の取得に失敗しました');
      return { success: false, error: '日付範囲の取得に失敗しました' };
    }
  }, []);
  
  // 過去のシフト期間を取得
  const getPastShifts = useCallback(async (groupId: string) => {
    try {
      // ローカルストレージから過去のシフト期間を取得
      const pastShiftsKey = `pastShifts_${groupId}`;
      const savedPastShifts = localStorage.getItem(pastShiftsKey);
      
      if (savedPastShifts) {
        return { success: true, data: JSON.parse(savedPastShifts) };
      }
      
      return { success: true, data: [] };
    } catch (err) {
      setError('過去のシフト期間の取得に失敗しました');
      return { success: false, error: '過去のシフト期間の取得に失敗しました' };
    }
  }, []);
  
  // 現在のシフト期間を過去のシフトに移動し、削除する
  const archiveCurrentShift = useCallback(async (groupId: string) => {
    try {
      // 現在の日付範囲を取得
      const currentRangeResponse = await getDateRange(groupId);
      if (!currentRangeResponse.success || !currentRangeResponse.data) {
        return { success: false, error: '現在のシフト期間が見つかりません' };
      }
      
      const currentRange = currentRangeResponse.data;
      
      // 過去のシフト期間リストを取得
      const pastShiftsResponse = await getPastShifts(groupId);
      const pastShifts = pastShiftsResponse.success && pastShiftsResponse.data 
        ? pastShiftsResponse.data 
        : [];
      
      // 現在の期間を過去のリストに追加
      pastShifts.push(currentRange);
      
      // 過去のシフト期間リストを保存
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(pastShifts));
      
      return { success: true, data: true };
    } catch (err) {
      setError('シフト期間のアーカイブに失敗しました');
      return { success: false, error: 'シフト期間のアーカイブに失敗しました' };
    }
  }, [getDateRange, getPastShifts]);
  
  // 過去のシフト期間を削除
  const deletePastShift = useCallback(async (groupId: string, startDate: string) => {
    try {
      // 過去のシフト期間リストを取得
      const pastShiftsResponse = await getPastShifts(groupId);
      if (!pastShiftsResponse.success || !pastShiftsResponse.data) {
        return { success: false, error: '過去のシフト期間が見つかりません' };
      }
      
      // 削除対象のシフト期間を除外
      const updatedPastShifts = pastShiftsResponse.data.filter(
        (shift: { startDate: string; days: number }) => shift.startDate !== startDate
      );
      
      // 更新された過去のシフト期間リストを保存
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(updatedPastShifts));
      
      // このシフト期間に関連するすべてのスタッフのシフトデータを削除
      // ここでは簡略化のため、特定の期間のシフトデータの削除は行わない
      // 実際のアプリケーションでは、データベースからの削除処理が必要
      
      return { success: true, data: true };
    } catch (err) {
      setError('過去のシフト期間の削除に失敗しました');
      return { success: false, error: '過去のシフト期間の削除に失敗しました' };
    }
  }, [getPastShifts]);
  
  // 6週間以上前のシフトデータを削除
  const cleanupOldShifts = useCallback(async () => {
    try {
      const response = await api.callApi(() => shiftService.cleanupOldShifts());
      return response;
    } catch (err) {
      setError('古いシフトデータの削除に失敗しました');
      return { success: false, error: '古いシフトデータの削除に失敗しました' };
    }
  }, [api]);

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
    loading: api.loading,
    error: api.error || error
  };
} 