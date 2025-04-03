import { supabase } from '@/lib/supabase';
import { ShiftData, ShiftInfo } from '@/types';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

// スタッフ関連の操作
export const staffService = {
  // スタッフ一覧を取得
  async getStaffList(groupId?: string): Promise<ShiftData[]> {
    try {
      console.log(`スタッフ一覧取得 - グループID: ${groupId || '未指定'}`);
      
      // スタッフデータを取得
      let query = supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: true });
      
      // グループIDが指定されている場合はフィルタリング
      if (groupId) {
        console.log(`グループID: ${groupId} でスタッフをフィルタリングします`);
        query = query.eq('group_id', groupId);
      } else {
        console.warn('グループIDが指定されていません。すべてのスタッフが返されます');
      }
      
      const { data: staffData, error: staffError } = await query;

      if (staffError) {
        console.error('スタッフデータ取得エラー:', staffError);
        throw staffError;
      }
      
      if (!staffData) {
        console.log('スタッフデータが見つかりません');
        return [];
      }
      
      console.log(`取得したスタッフ数: ${staffData.length}人`);

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
      console.log('スタッフ追加開始:', { name, groupId });
      
      // IDを生成
      const id = uuidv4();
      
      // スタッフデータを挿入
      const { data, error } = await supabase
        .from('staff')
        .insert([{ 
          id, 
          name,
          group_id: groupId,
          user_id: null,  // 明示的にnullを設定
          role: 'staff'
        }])
        .select()
        .maybeSingle();

      if (error) {
        console.error('スタッフ追加中のSupabaseエラー:', error);
        throw error;
      }
      
      if (!data) {
        console.error('スタッフの追加に失敗: データが返されませんでした');
        throw new Error('スタッフの追加に失敗しました');
      }

      console.log('スタッフ追加成功:', data);
      
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
        .maybeSingle();

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
      console.log(`getDates呼び出し: startDate=${startDate?.toISOString() || '未指定'}, days=${days}`);
      const dates: string[] = [];
      const start = startDate ? new Date(startDate) : new Date();
      
      // タイムゾーンの問題を回避するため、日付のみに統一
      start.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        
        // YYYY-MM-DD形式で保存（UTC問題を回避）
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        dates.push(formattedDate);
      }
      
      console.log(`生成された日付一覧: ${JSON.stringify(dates)}`);
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
        .maybeSingle();

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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: 結果が見つからない
      if (!data) return null;

      const cleanNote = data.note ? data.note.trim() : '';

      return {
        startTime: data.start_time || '',
        endTime: data.end_time || '',
        isWorking: !data.is_off,
        note: cleanNote
      } as ShiftInfo;
    } catch (error) {
      console.error('シフト情報の取得に失敗しました:', error);
      throw error;
    }
  },

  // シフト情報を更新または作成
  async updateShift(shiftInfo: ShiftInfo): Promise<ShiftInfo | null> {
    try {
      const { startTime, endTime, note, isWorking } = shiftInfo;

      // まずはシフトが存在するか確認
      const { data: existingShift, error: checkError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', shiftInfo.staff_id)
        .eq('date', shiftInfo.date)
        .maybeSingle();

      if (checkError) {
        console.error('シフト確認エラー:', checkError);
        throw checkError;
      }

      let error;
      if (existingShift) {
        // 既存のシフトがある場合は更新
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            start_time: startTime,
            end_time: endTime,
            note,
            is_off: !isWorking
          })
          .eq('staff_id', shiftInfo.staff_id)
          .eq('date', shiftInfo.date);
        
        error = updateError;
      } else {
        // 新規シフトの場合は挿入
        const { error: insertError } = await supabase
          .from('shifts')
          .insert({
            id: uuidv4(),
            staff_id: shiftInfo.staff_id,
            date: shiftInfo.date,
            start_time: startTime,
            end_time: endTime,
            note,
            is_off: !isWorking
          });
        
        error = insertError;
      }

      if (error) {
        console.error('シフト更新エラー:', error);
        throw error;
      }

      return shiftInfo;
    } catch (error) {
      console.error('シフト更新エラー:', error);
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
      console.log(`スタッフID: ${staffId}のシフトデータを取得します`);
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId);

      if (error) {
        console.error('シフトデータ取得エラー:', error);
        throw error;
      }

      // シフトデータをフォーマット
      const shiftsRecord: Record<string, ShiftInfo> = {};
      if (data) {
        console.log(`取得したシフト数: ${data.length}`);
        data.forEach((shift) => {
          const cleanNote = shift.note ? shift.note.trim() : '';
          
          shiftsRecord[shift.date] = {
            staff_id: staffId,
            date: shift.date,
            isWorking: !shift.is_off,
            startTime: shift.start_time || '',
            endTime: shift.end_time || '',
            note: cleanNote
          } as ShiftInfo;
        });
      } else {
        console.log('シフトデータはありません');
      }

      return shiftsRecord;
    } catch (error) {
      console.error('スタッフのシフト一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // スタッフの全シフトを一括で更新
  async updateStaffShifts(staffId: string, isWorking: boolean, specificDates?: string[]): Promise<boolean> {
    try {
      console.log(`スタッフID: ${staffId}の全シフトを${isWorking ? '勤務可能' : '休み'}に設定します`);
      
      // staffIdを持つスタッフがどのグループに所属しているか確認
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('group_id')
        .eq('id', staffId)
        .maybeSingle();
        
      if (staffError) {
        console.error('スタッフデータの取得に失敗しました:', staffError);
        throw staffError;
      }
      
      if (!staffData || !staffData.group_id) {
        console.error('スタッフがグループに所属していないか、データの取得に失敗しました');
        throw new Error('スタッフデータの取得に失敗しました');
      }
      
      const groupId = staffData.group_id;
      console.log(`スタッフのグループID: ${groupId}`);
      
      let dates: string[] = [];
      
      // 特定の日付が指定されている場合はそれを使用
      if (specificDates && specificDates.length > 0) {
        dates = specificDates;
        console.log('指定された日付で更新を実行:', dates);
      } 
      // 指定がない場合はグループの日付範囲を取得
      else {
        try {
          const dateRange = await this.getDateRange(groupId);
          if (dateRange) {
            const { startDate, days } = dateRange;
            dates = await this.getDates(new Date(startDate), days);
            console.log(`グループの日付範囲を使用: ${startDate}から${days}日間`);
          } else {
            // グループに日付範囲が設定されていない場合はデフォルトを使用
            dates = await this.getDates();
            console.log('デフォルトの日付範囲を使用');
          }
        } catch (error) {
          console.error('日付範囲の取得に失敗しました:', error);
          // エラーが発生した場合もデフォルトを使用
          dates = await this.getDates();
          console.log('エラーのためデフォルトの日付範囲を使用');
        }
      }
      
      console.log(`更新対象の日付数: ${dates.length}日間, 対象日: ${JSON.stringify(dates)}`);
      
      // 一度に処理する最大数を増やす
      const BATCH_SIZE = 14; // 全ての日程（通常14日）を一度に処理
      let success = true;
      
      // バッチ処理でシフトを更新
      for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        console.log(`バッチ処理: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目, 日付: ${JSON.stringify(batch)}`);
        
        // 現在のバッチの処理を並列実行
        const batchPromises = batch.map(async (date) => {
          try {
            // 既存のシフトがあるか確認
            const { data: existingShift, error: checkError } = await supabase
              .from('shifts')
              .select('*')
              .eq('staff_id', staffId)
              .eq('date', date)
              .maybeSingle();
              
            if (checkError) {
              console.error(`日付: ${date}のシフト確認エラー:`, checkError);
              return false;
            }
            
            const startTime = '09:00';
            const endTime = '22:00';
            let note = '';
            
            // 既存のシフトがある場合
            if (existingShift) {
              console.log(`既存シフト更新: ${date}, is_off=${!isWorking}`);
              
              // メモ情報は引き継ぐ
              note = existingShift.note || note;
              
              // 全日勤務 or 休みのどちらの場合も、時間は標準設定（09:00-22:00）にする
              // これにより一貫性が保たれ、全日勤務→休み→全日勤務のような切り替えでも問題なくなる
              
              // 更新
              const { data: updateData, error: updateError } = await supabase
                .from('shifts')
                .update({
                  start_time: startTime,
                  end_time: endTime,
                  note,
                  is_off: !isWorking
                })
                .eq('staff_id', staffId)
                .eq('date', date)
                .select();
                
              if (updateError) {
                console.error(`日付: ${date}のシフト更新エラー:`, updateError);
                return false;
              }
              
              console.log(`シフト更新完了: ${date}, 結果:`, updateData ? '成功' : '不明');
            } else {
              console.log(`新規シフト作成: ${date}, is_off=${!isWorking}`);
              // 新規作成
              const { data: insertData, error: insertError } = await supabase
                .from('shifts')
                .insert({
                  id: uuidv4(),
                  staff_id: staffId,
                  date,
                  start_time: startTime,
                  end_time: endTime,
                  note,
                  is_off: !isWorking
                })
                .select();
                
              if (insertError) {
                console.error(`日付: ${date}のシフト作成エラー:`, insertError);
                return false;
              }
              
              console.log(`シフト作成完了: ${date}, 結果:`, insertData ? '成功' : '不明');
            }
            
            return true;
          } catch (error) {
            console.error(`日付: ${date}の処理でエラー:`, error);
            return false;
          }
        });
        
        // バッチ処理の結果を確認
        const batchResults = await Promise.all(batchPromises);
        const batchSuccess = batchResults.every(result => result === true);
        if (!batchSuccess) {
          console.warn(`バッチ処理でエラーが発生しました: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目`);
          const failedIndices = batchResults.map((result, index) => !result ? index : -1).filter(index => index !== -1);
          console.warn(`失敗した日程のインデックス: ${failedIndices.join(', ')}`);
          success = false;
        } else {
          console.log(`バッチ処理成功: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目`);
        }
        
        // 次のバッチ処理の前に少し待機（レート制限対策）
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`全シフト更新処理完了. 結果: ${success ? '成功' : '一部失敗'}`);
      return success;
    } catch (error) {
      console.error('スタッフの全シフト一括更新に失敗しました:', error);
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

  // シフト確定状態を取得
  async getShiftConfirmation(staffId: string): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('is_shift_confirmed')
        .eq('id', staffId)
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: { isConfirmed: data?.is_shift_confirmed ?? false }
      };
    } catch (error) {
      console.error('シフト確定状態の取得に失敗しました:', error);
      return { success: false, error: '確定状態の取得に失敗しました' };
    }
  },

  // シフトを確定
  async confirmShift(staffId: string): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update({ is_shift_confirmed: true })
        .eq('id', staffId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: { isConfirmed: data?.is_shift_confirmed ?? true }
      };
    } catch (error) {
      console.error('シフト確定に失敗しました:', error);
      return { success: false, error: 'シフト確定に失敗しました' };
    }
  },

  // シフト確定を解除
  async unconfirmShift(staffId: string): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update({ is_shift_confirmed: false })
        .eq('id', staffId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: { isConfirmed: data?.is_shift_confirmed ?? false }
      };
    } catch (error) {
      console.error('シフト確定解除に失敗しました:', error);
      return { success: false, error: 'シフト確定解除に失敗しました' };
    }
  },
}; 