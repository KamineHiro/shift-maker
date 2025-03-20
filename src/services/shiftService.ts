import { ShiftInfo } from '@/types';

// シフト関連のサービス
const shiftService = {
  // 日付データを取得
  getDates: async (startDate?: Date, days: number = 14) => {
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
    } catch (error: unknown) {
      console.error('日付データの取得エラー:', error);
      return { success: false, error: '日付データの取得に失敗しました' };
    }
  },
  
  // 特定のスタッフの特定の日付のシフトを取得
  getShift: async (staffId: string, date: string) => {
    try {
      // ローカルストレージからシフト情報を取得
      const key = `shift_${staffId}_${date}`;
      const savedShift = localStorage.getItem(key);
      
      if (savedShift) {
        return { success: true, data: JSON.parse(savedShift) };
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.error('シフト情報の取得エラー:', error);
      return { success: false, error: 'シフト情報の取得に失敗しました' };
    }
  },
  
  // 特定のスタッフの特定の日付のシフトを更新
  updateShift: async (staffId: string, date: string, shiftInfo: ShiftInfo) => {
    try {
      // ローカルストレージにシフト情報を保存
      const key = `shift_${staffId}_${date}`;
      localStorage.setItem(key, JSON.stringify(shiftInfo));
      
      return { success: true };
    } catch (error: unknown) {
      console.error('シフト更新エラー:', error);
      throw error;
    }
  },
  
  // 特定のスタッフの特定の日付のシフトを削除
  deleteShift: async (staffId: string, date: string) => {
    try {
      const key = `shift_${staffId}_${date}`;
      localStorage.removeItem(key);
      
      return { success: true };
    } catch (error: unknown) {
      console.error('シフト情報の削除エラー:', error);
      return { success: false, error: 'シフト情報の削除に失敗しました' };
    }
  },
  
  // 特定のスタッフの全シフトを取得
  getStaffShifts: async (staffId: string) => {
    try {
      const shifts: Record<string, ShiftInfo> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(`shift_${staffId}_`)) {
          const date = key.split(`shift_${staffId}_`)[1];
          const shiftData = localStorage.getItem(key);
          
          if (shiftData) {
            shifts[date] = JSON.parse(shiftData);
          }
        }
      }
      
      return { success: true, data: shifts };
    } catch (error: unknown) {
      console.error('スタッフのシフト情報の取得エラー:', error);
      return { success: false, error: 'スタッフのシフト情報の取得に失敗しました' };
    }
  },
  
  // 日付範囲を保存
  saveDateRange: async (groupId: string, startDate: string, days: number) => {
    try {
      localStorage.setItem(`dateRange_${groupId}`, JSON.stringify({ startDate, days }));
      return { success: true };
    } catch (error: unknown) {
      console.error('日付範囲の保存エラー:', error);
      return { success: false, error: '日付範囲の保存に失敗しました' };
    }
  },
  
  // 日付範囲を取得
  getDateRange: async (groupId: string) => {
    try {
      const savedRange = localStorage.getItem(`dateRange_${groupId}`);
      
      if (savedRange) {
        return { success: true, data: JSON.parse(savedRange) };
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.error('日付範囲の取得エラー:', error);
      return { success: false, error: '日付範囲の取得に失敗しました' };
    }
  },
  
  // 過去のシフト期間を取得
  getPastShifts: async (groupId: string) => {
    try {
      const pastShiftsKey = `pastShifts_${groupId}`;
      const savedPastShifts = localStorage.getItem(pastShiftsKey);
      
      if (savedPastShifts) {
        return { success: true, data: JSON.parse(savedPastShifts) };
      }
      
      return { success: true, data: [] };
    } catch (error: unknown) {
      console.error('過去のシフト期間の取得エラー:', error);
      return { success: false, error: '過去のシフト期間の取得に失敗しました' };
    }
  },
  
  // 現在のシフト期間を過去のシフトに移動し、削除する
  archiveCurrentShift: async (groupId: string) => {
    try {
      const currentRangeResponse = await shiftService.getDateRange(groupId);
      if (!currentRangeResponse.success || !currentRangeResponse.data) {
        return { success: false, error: '現在のシフト期間が見つかりません' };
      }
      
      const currentRange = currentRangeResponse.data;
      const pastShiftsResponse = await shiftService.getPastShifts(groupId);
      const pastShifts = pastShiftsResponse.success && pastShiftsResponse.data 
        ? pastShiftsResponse.data 
        : [];
      
      pastShifts.push(currentRange);
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(pastShifts));
      
      return { success: true };
    } catch (error: unknown) {
      console.error('シフト期間のアーカイブエラー:', error);
      return { success: false, error: 'シフト期間のアーカイブに失敗しました' };
    }
  },
  
  // 過去のシフト期間を削除
  deletePastShift: async (groupId: string, startDate: string) => {
    try {
      const pastShiftsResponse = await shiftService.getPastShifts(groupId);
      if (!pastShiftsResponse.success || !pastShiftsResponse.data) {
        return { success: false, error: '過去のシフト期間が見つかりません' };
      }
      
      const updatedPastShifts = pastShiftsResponse.data.filter(
        (shift: { startDate: string; days: number }) => shift.startDate !== startDate
      );
      
      localStorage.setItem(`pastShifts_${groupId}`, JSON.stringify(updatedPastShifts));
      
      const targetShift = pastShiftsResponse.data.find(
        (shift: { startDate: string; days: number }) => shift.startDate === startDate
      );
      
      if (targetShift) {
        const { days } = targetShift;
        const dates = [];
        
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          if (key && key.startsWith('shift_')) {
            const parts = key.split('_');
            if (parts.length === 3) {
              const shiftDate = parts[2];
              
              if (dates.includes(shiftDate)) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      }
      
      return { success: true };
    } catch (error: unknown) {
      console.error('過去のシフト期間の削除エラー:', error);
      return { success: false, error: '過去のシフト期間の削除に失敗しました' };
    }
  }
};

export default shiftService; 