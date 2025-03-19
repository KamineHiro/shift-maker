import { supabase } from '@/lib/supabase';
import { ShiftData, ShiftInfo } from '@/types';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

// スタッフ関連の操作
export const staffService = {
  // スタッフ一覧を取得
  async getStaffList(groupId?: string): Promise<ShiftData[]> {
    try {
      // スタッフデータを取得
      let query = supabase
        .from('staff')
        .select('*')
        .order('name');
      
      // グループIDが指定されている場合はフィルタリング
      if (groupId) {
        query = query.eq('group_id', groupId);
      }
      
      const { data: staffData, error: staffError } = await query;

      if (staffError) throw staffError;
      if (!staffData) return [];

      // 各スタッフのシフト情報を取得
      const staffWithShifts: ShiftData[] = await Promise.all(
        staffData.map(async (staff) => {
          const { data: shiftsData, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .eq('staff_id', staff.id);

          if (shiftsError) throw shiftsError;

          // シフトデータをフォーマット
          const shifts: { [date: string]: ShiftInfo } = {};
          if (shiftsData) {
            shiftsData.forEach((shift) => {
              shifts[shift.date] = {
                startTime: shift.start_time || '',
                endTime: shift.end_time || '',
                isWorking: !shift.is_off,
                note: shift.note || ''
              } as ShiftInfo;
            });
          }

          return {
            staff_id: staff.id,
            name: staff.name,
            shifts
          };
        })
      );

      return staffWithShifts;
    } catch (error) {
      console.error('スタッフ一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // 特定のスタッフを取得
  async getStaff(id: string): Promise<ShiftData | null> {
    try {
      console.log(`getStaff呼び出し - ID: ${id}, 型: ${typeof id}, UUID有効: ${isUUID(id)}`);
      
      // スタッフデータを取得
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      console.log(`スタッフデータ取得結果:`, staff ? '成功' : '該当なし', staffError ? `エラー: ${staffError.message}` : 'エラーなし');

      if (staffError) throw staffError;
      if (!staff) {
        console.log(`スタッフが見つかりません (ID: ${id})`);
        return null;
      }

      // シフト情報を取得
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', id);

      if (shiftsError) throw shiftsError;

      // シフトデータをフォーマット
      const shifts: { [date: string]: ShiftInfo } = {};
      if (shiftsData) {
        shiftsData.forEach((shift) => {
          shifts[shift.date] = {
            startTime: shift.start_time || '',
            endTime: shift.end_time || '',
            isWorking: !shift.is_off,
            note: shift.note || ''
          } as ShiftInfo;
        });
      }

      return {
        staff_id: staff.id,
        name: staff.name,
        shifts
      };
    } catch (error) {
      console.error('スタッフの取得に失敗しました:', error);
      throw error;
    }
  },

  // スタッフを追加
  async addStaff(name: string, groupId?: string): Promise<ShiftData> {
    try {
      // 現在のユーザーセッションを取得
      const { data: { user } } = await supabase.auth.getUser();

      const id = uuidv4();
      const { data, error } = await supabase
        .from('staff')
        .insert([{ 
          id, 
          name,
          group_id: groupId,
          user_id: user?.id || null
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('スタッフの追加に失敗しました');

      return {
        staff_id: data.id,
        name: data.name,
        shifts: {}
      };
    } catch (error) {
      console.error('スタッフの追加に失敗しました:', error);
      throw error;
    }
  },

  // スタッフ情報を更新
  async updateStaff(id: string, name: string): Promise<ShiftData> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('スタッフの更新に失敗しました');

      // 現在のシフト情報を取得
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', id);

      if (shiftsError) throw shiftsError;

      // シフトデータをフォーマット
      const shifts: { [date: string]: ShiftInfo } = {};
      if (shiftsData) {
        shiftsData.forEach((shift) => {
          shifts[shift.date] = {
            startTime: shift.start_time || '',
            endTime: shift.end_time || '',
            isWorking: !shift.is_off,
            note: shift.note || ''
          } as ShiftInfo;
        });
      }

      return {
        staff_id: data.id,
        name: data.name,
        shifts
      };
    } catch (error) {
      console.error('スタッフの更新に失敗しました:', error);
      throw error;
    }
  },

  // スタッフを削除
  async deleteStaff(id: string): Promise<void> {
    try {
      // 関連するシフト情報も削除
      const { error: shiftsError } = await supabase
        .from('shifts')
        .delete()
        .eq('staff_id', id);

      if (shiftsError) throw shiftsError;

      // スタッフを削除
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('スタッフの削除に失敗しました:', error);
      throw error;
    }
  }
};

// シフト関連の操作
export const shiftService = {
  // 日付一覧を取得（デフォルトは現在の日付から14日間）
  async getDates(startDate?: Date, days: number = 14): Promise<string[]> {
    try {
      const dates: string[] = [];
      const start = startDate || new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        // YYYY-MM-DD形式で保存
        dates.push(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
      }
      
      return dates;
    } catch (error) {
      console.error('日付一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // 日付範囲を保存
  async saveDateRange(groupId: string, startDate: string, days: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          shift_start_date: startDate,
          shift_days: days
        })
        .eq('id', groupId);

      if (error) throw error;
    } catch (error) {
      console.error('日付範囲の保存に失敗しました:', error);
      throw error;
    }
  },

  // グループの日付範囲を取得
  async getDateRange(groupId: string): Promise<{ startDate: string; days: number } | null> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('shift_start_date, shift_days')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        startDate: data.shift_start_date || new Date().toISOString().split('T')[0],
        days: data.shift_days || 14
      };
    } catch (error) {
      console.error('日付範囲の取得に失敗しました:', error);
      return null;
    }
  },

  // 特定のスタッフの特定の日付のシフト情報を取得
  async getShift(staffId: string, date: string): Promise<ShiftInfo | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: 結果が見つからない
      if (!data) return null;

      // 全日OKの判定（noteフィールドに特定の文字列があるか確認）
      const isAllDay = data.note?.includes('[全日OK]') || false;
      const cleanNote = data.note ? data.note.replace('[全日OK]', '').trim() : '';

      return {
        startTime: data.start_time || '',
        endTime: data.end_time || '',
        isWorking: !data.is_off,
        note: cleanNote,
        isAllDay: data.note?.includes('[全日OK]') || false
      } as ShiftInfo;
    } catch (error) {
      console.error('シフト情報の取得に失敗しました:', error);
      throw error;
    }
  },

  // シフト情報を更新または作成
  async updateShift(staffId: string, date: string, shiftInfo: ShiftInfo): Promise<ShiftInfo> {
    try {
      // デバッグ情報
      console.log('シフト更新呼び出し:', { staffId, date, shiftInfo });
      
      // UUID形式のバリデーション
      if (!isUUID(staffId)) {
        throw new Error(`無効なスタッフID形式: ${staffId}`);
      }
      
      // スタッフが存在するか確認
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('id', staffId)
        .single();
        
      if (staffError || !staff) {
        throw new Error(`スタッフが存在しません (ID: ${staffId})`);
      }
      
      // 全日OKの場合はnoteフィールドに特定の文字列を追加
      const noteWithAllDay = shiftInfo.isAllDay 
        ? `[全日OK]${shiftInfo.note || ''}`
        : shiftInfo.note;

      const shiftData = {
        start_time: shiftInfo.startTime || null,
        end_time: shiftInfo.endTime || null,
        is_off: !shiftInfo.isWorking,
        note: noteWithAllDay || null
      };

      // UPSERTを使用してシフト情報を更新または作成
      const { data: upsertedData, error: upsertError } = await supabase
        .from('shifts')
        .upsert({
          id: uuidv4(), // 新規作成時のみ使用
          staff_id: staffId,
          date,
          ...shiftData
        }, {
          onConflict: 'staff_id,date',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('シフト更新/作成エラー:', upsertError);
        throw upsertError;
      }

      console.log('シフト更新/作成成功:', upsertedData);

      return {
        ...shiftInfo,
        staff_id: staffId,
        date: date
      };
    } catch (error) {
      console.error('シフト情報の更新に失敗しました:', error);
      throw error;
    }
  },

  // シフト情報を削除
  async deleteShift(staffId: string, date: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('staff_id', staffId)
        .eq('date', date);

      if (error) throw error;
    } catch (error) {
      console.error('シフト情報の削除に失敗しました:', error);
      throw error;
    }
  },

  // 特定のスタッフの全シフトを取得
  async getStaffShifts(staffId: string): Promise<Record<string, ShiftInfo>> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId);

      if (error) throw error;

      // シフトデータをフォーマット
      const shiftsRecord: Record<string, ShiftInfo> = {};
      if (data) {
        data.forEach((shift) => {
          // 全日OKの判定（noteフィールドに特定の文字列があるか確認）
          const isAllDay = shift.note?.includes('[全日OK]') || false;
          const cleanNote = shift.note ? shift.note.replace('[全日OK]', '').trim() : '';
          
          shiftsRecord[shift.date] = {
            staff_id: staffId,
            date: shift.date,
            isWorking: !shift.is_off,
            startTime: shift.start_time || '',
            endTime: shift.end_time || '',
            note: cleanNote,
            isAllDay: isAllDay
          } as ShiftInfo;
        });
      }

      return shiftsRecord;
    } catch (error) {
      console.error('スタッフのシフト一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // 6週間以上前のシフトデータを削除
  cleanupOldShifts: async () => {
    try {
      const sixWeeksAgo = new Date();
      sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42); // 6週間 = 42日
      const cutoffDate = sixWeeksAgo.toISOString().split('T')[0];

      // まず削除対象のデータ数を確認
      const { data: oldShifts, error: countError } = await supabase
        .from('shifts')
        .select('id')
        .lt('date', cutoffDate);

      if (countError) throw countError;

      if (!oldShifts || oldShifts.length === 0) {
        return { success: true, message: '削除対象の古いシフトデータはありませんでした' };
      }

      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .lt('date', cutoffDate);

      if (deleteError) throw deleteError;

      return { 
        success: true, 
        message: `${oldShifts.length}件の古いシフトデータを削除しました` 
      };
    } catch (error) {
      console.error('Error cleaning up old shifts:', error);
      return { 
        success: false, 
        error: '古いシフトデータの削除に失敗しました',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました'
      };
    }
  },
}; 