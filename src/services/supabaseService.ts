import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ShiftData, ShiftInfo } from '@/types';
import { validate as isUUID } from 'uuid';

/** shifts / staff テーブルは RLS のため、全操作にアクセスキーまたは管理者キーが必要 */
export type GroupSecretKeys = { accessKey?: string; adminKey?: string };

/** admin_key があれば管理者権限、なければ access_key を使う（無ければ null） */
function resolveSecret(keys?: GroupSecretKeys): { secret: string; isAdminKey: boolean } | null {
  if (keys?.adminKey) return { secret: keys.adminKey, isAdminKey: true };
  if (keys?.accessKey) return { secret: keys.accessKey, isAdminKey: false };
  return null;
}

async function fetchShiftScheduleFromRpc(
  keys: GroupSecretKeys
): Promise<{ startDate: string; days: number } | null> {
  const resolved = resolveSecret(keys);
  if (!resolved) return null;

  const { data, error } = await supabase.rpc('get_group_shift_schedule', {
    p_secret: resolved.secret,
    p_is_admin_key: resolved.isAdminKey,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    startDate: row.shift_start_date || new Date().toISOString().split('T')[0],
    days: row.shift_days ?? 14,
  };
}

// スタッフ関連の操作
export const staffService = {
  // スタッフ一覧を取得
  async getStaffList(groupId?: string, keys?: GroupSecretKeys): Promise<ShiftData[]> {
    try {
      logger.log(`スタッフ一覧取得 - グループID: ${groupId || '未指定'}`);

      const resolved = resolveSecret(keys);
      if (!resolved) {
        logger.warn('シークレットが指定されていないため、スタッフ一覧は取得できません');
        return [];
      }

      const { data: staffData, error: staffError } = await supabase.rpc('get_staff_list', {
        p_secret: resolved.secret,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (staffError) {
        logger.error('スタッフデータ取得エラー:', staffError);
        throw staffError;
      }

      if (!staffData || staffData.length === 0) {
        logger.log('スタッフデータが見つかりません');
        return [];
      }

      logger.log(`取得したスタッフ数: ${staffData.length}人`);

      // 各スタッフのシフト情報を取得
      const staffWithShifts: ShiftData[] = await Promise.all(
        staffData.map(async (staff) => {
          const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_staff_shifts', {
            p_secret: resolved.secret,
            p_staff_id: staff.id,
            p_is_admin_key: resolved.isAdminKey,
          });

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
      logger.error('スタッフ一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // 特定のスタッフを取得
  async getStaff(id: string, keys?: GroupSecretKeys): Promise<ShiftData | null> {
    try {
      logger.log(`getStaff呼び出し - ID: ${id}, 型: ${typeof id}, UUID有効: ${isUUID(id)}`);

      const resolved = resolveSecret(keys);
      if (!resolved) {
        logger.warn('シークレットが指定されていないため、スタッフを取得できません');
        return null;
      }

      // スタッフデータを取得
      const { data: staffRows, error: staffError } = await supabase.rpc('get_staff', {
        p_secret: resolved.secret,
        p_staff_id: id,
        p_is_admin_key: resolved.isAdminKey,
      });

      logger.log(`スタッフデータ取得結果:`, staffRows?.length ? '成功' : '該当なし', staffError ? `エラー: ${staffError.message}` : 'エラーなし');

      if (staffError) throw staffError;
      const staff = staffRows?.[0];
      if (!staff) {
        logger.log(`スタッフが見つかりません (ID: ${id})`);
        return null;
      }

      // シフト情報を取得
      const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_staff_shifts', {
        p_secret: resolved.secret,
        p_staff_id: id,
        p_is_admin_key: resolved.isAdminKey,
      });

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
      logger.error('スタッフの取得に失敗しました:', error);
      throw error;
    }
  },

  // スタッフを追加（管理者キー必須）
  async addStaff(name: string, groupId?: string, keys?: GroupSecretKeys): Promise<ShiftData> {
    try {
      logger.log('スタッフ追加開始:', { name, groupId });

      const { data, error } = await supabase.rpc('add_staff', {
        p_admin_key: keys?.adminKey ?? '',
        p_name: name,
      });

      if (error) {
        logger.error('スタッフ追加中のSupabaseエラー:', error);
        throw error;
      }

      const staff = data?.[0];
      if (!staff) {
        logger.error('スタッフの追加に失敗: データが返されませんでした');
        throw new Error('スタッフの追加に失敗しました');
      }

      logger.log('スタッフ追加成功:', staff);

      return {
        staff_id: staff.id,
        name: staff.name,
        shifts: {}
      };
    } catch (error) {
      logger.error('スタッフの追加に失敗しました:', error);
      throw error;
    }
  },

  // スタッフ情報を更新（管理者キー必須）
  async updateStaff(id: string, name: string, keys?: GroupSecretKeys): Promise<ShiftData> {
    try {
      const { data, error } = await supabase.rpc('update_staff_name', {
        p_admin_key: keys?.adminKey ?? '',
        p_staff_id: id,
        p_name: name,
      });

      if (error) throw error;
      const staff = data?.[0];
      if (!staff) throw new Error('スタッフの更新に失敗しました');

      // 現在のシフト情報を取得
      const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_staff_shifts', {
        p_secret: keys?.adminKey ?? '',
        p_staff_id: id,
        p_is_admin_key: true,
      });

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
      logger.error('スタッフの更新に失敗しました:', error);
      throw error;
    }
  },

  // スタッフを削除（管理者キー必須。関連するシフト情報も削除）
  async deleteStaff(id: string, keys?: GroupSecretKeys): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_staff', {
        p_admin_key: keys?.adminKey ?? '',
        p_staff_id: id,
      });

      if (error) throw error;
    } catch (error) {
      logger.error('スタッフの削除に失敗しました:', error);
      throw error;
    }
  }
};

// シフト関連の操作
export const shiftService = {
  // 日付一覧を取得（デフォルトは現在の日付から14日間）
  async getDates(startDate?: Date, days: number = 14): Promise<string[]> {
    try {
      logger.log(`getDates呼び出し: startDate=${startDate?.toISOString() || '未指定'}, days=${days}`);
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

      logger.log(`生成された日付一覧: ${JSON.stringify(dates)}`);
      return dates;
    } catch (error) {
      logger.error('日付一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // 日付範囲を保存（管理者キー必須・RPC）
  async saveDateRange(adminKey: string, startDate: string, days: number): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('update_group_shift_schedule', {
        p_admin_key: adminKey,
        p_start_date: startDate,
        p_shift_days: days,
      });

      if (error) throw error;
      if (data !== true) {
        throw new Error('日付範囲の更新に失敗しました（管理者キーを確認してください）');
      }
    } catch (error) {
      logger.error('日付範囲の保存に失敗しました:', error);
      throw error;
    }
  },

  // グループの日付範囲を取得（共有キー経由の RPC）
  async getDateRange(
    _groupId: string,
    keys?: GroupSecretKeys
  ): Promise<{ startDate: string; days: number } | null> {
    try {
      if (!keys || (!keys.accessKey && !keys.adminKey)) {
        return null;
      }
      return await fetchShiftScheduleFromRpc(keys);
    } catch (error) {
      logger.error('日付範囲の取得に失敗しました:', error);
      return null;
    }
  },

  // 特定のスタッフの特定の日付のシフト情報を取得
  async getShift(staffId: string, date: string, keys?: GroupSecretKeys): Promise<ShiftInfo | null> {
    try {
      const resolved = resolveSecret(keys);
      if (!resolved) return null;

      const { data, error } = await supabase.rpc('get_shift', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_date: date,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;

      const cleanNote = row.note ? row.note.trim() : '';

      return {
        startTime: row.start_time || '',
        endTime: row.end_time || '',
        isWorking: !row.is_off,
        note: cleanNote
      } as ShiftInfo;
    } catch (error) {
      logger.error('シフト情報の取得に失敗しました:', error);
      throw error;
    }
  },

  // シフト情報を更新または作成
  async updateShift(shiftInfo: ShiftInfo, keys?: GroupSecretKeys): Promise<ShiftInfo | null> {
    try {
      const { startTime, endTime, note, isWorking } = shiftInfo;

      const resolved = resolveSecret(keys);
      if (!resolved) {
        throw new Error('シフトの更新にはアクセスキーが必要です');
      }

      const { error } = await supabase.rpc('upsert_shift', {
        p_secret: resolved.secret,
        p_staff_id: shiftInfo.staff_id,
        p_date: shiftInfo.date,
        p_start_time: startTime ?? '',
        p_end_time: endTime ?? '',
        p_is_off: !isWorking,
        p_note: note ?? '',
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) {
        logger.error('シフト更新エラー:', error);
        throw error;
      }

      return shiftInfo;
    } catch (error) {
      logger.error('シフト更新エラー:', error);
      throw error;
    }
  },

  // シフト情報を削除
  async deleteShift(staffId: string, date: string, keys?: GroupSecretKeys): Promise<void> {
    try {
      const resolved = resolveSecret(keys);
      if (!resolved) {
        throw new Error('シフトの削除にはアクセスキーが必要です');
      }

      const { error } = await supabase.rpc('delete_shift', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_date: date,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) throw error;
    } catch (error) {
      logger.error('シフト情報の削除に失敗しました:', error);
      throw error;
    }
  },

  // 特定のスタッフの全シフトを取得
  async getStaffShifts(staffId: string, keys?: GroupSecretKeys): Promise<Record<string, ShiftInfo>> {
    try {
      logger.log(`スタッフID: ${staffId}のシフトデータを取得します`);

      const resolved = resolveSecret(keys);
      if (!resolved) {
        logger.warn('シークレットが指定されていないため、シフトデータを取得できません');
        return {};
      }

      const { data, error } = await supabase.rpc('get_staff_shifts', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) {
        logger.error('シフトデータ取得エラー:', error);
        throw error;
      }

      // シフトデータをフォーマット
      const shiftsRecord: Record<string, ShiftInfo> = {};
      if (data) {
        logger.log(`取得したシフト数: ${data.length}`);
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
        logger.log('シフトデータはありません');
      }

      return shiftsRecord;
    } catch (error) {
      logger.error('スタッフのシフト一覧の取得に失敗しました:', error);
      throw error;
    }
  },

  // スタッフの全シフトを一括で更新
  async updateStaffShifts(
    staffId: string,
    isWorking: boolean,
    specificDates?: string[],
    groupKeys?: GroupSecretKeys
  ): Promise<boolean> {
    try {
      logger.log(`スタッフID: ${staffId}の全シフトを${isWorking ? '勤務可能' : '休み'}に設定します`);

      const resolved = resolveSecret(groupKeys);
      if (!resolved) {
        throw new Error('シフトの一括更新にはアクセスキーが必要です');
      }

      let dates: string[] = [];

      // 特定の日付が指定されている場合はそれを使用
      if (specificDates && specificDates.length > 0) {
        dates = specificDates;
        logger.log('指定された日付で更新を実行:', dates);
      }
      // 指定がない場合はグループの日付範囲を取得
      else {
        try {
          const dateRange = await this.getDateRange('', groupKeys);
          if (dateRange) {
            const { startDate, days } = dateRange;
            dates = await this.getDates(new Date(startDate), days);
            logger.log(`グループの日付範囲を使用: ${startDate}から${days}日間`);
          } else {
            dates = await this.getDates();
            logger.log('デフォルトの日付範囲を使用');
          }
        } catch (error) {
          logger.error('日付範囲の取得に失敗しました:', error);
          dates = await this.getDates();
          logger.log('エラーのためデフォルトの日付範囲を使用');
        }
      }

      logger.log(`更新対象の日付数: ${dates.length}日間, 対象日: ${JSON.stringify(dates)}`);

      // 一度に処理する最大数を増やす
      const BATCH_SIZE = 14; // 全ての日程（通常14日）を一度に処理
      let success = true;

      // バッチ処理でシフトを更新
      for (let i = 0; i < dates.length; i += BATCH_SIZE) {
        const batch = dates.slice(i, i + BATCH_SIZE);
        logger.log(`バッチ処理: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目, 日付: ${JSON.stringify(batch)}`);

        // 現在のバッチの処理を並列実行
        const batchPromises = batch.map(async (date) => {
          try {
            const startTime = '09:00';
            const endTime = '22:00';

            // 既存の note があれば維持、なければ空文字（upsert_shift 側で解決）
            const { error } = await supabase.rpc('upsert_shift', {
              p_secret: resolved.secret,
              p_staff_id: staffId,
              p_date: date,
              p_start_time: startTime,
              p_end_time: endTime,
              p_is_off: !isWorking,
              p_note: '',
              p_is_admin_key: resolved.isAdminKey,
              p_preserve_existing_note: true,
            });

            if (error) {
              logger.error(`日付: ${date}のシフト更新エラー:`, error);
              return false;
            }

            logger.log(`シフト更新完了: ${date}, is_off=${!isWorking}`);
            return true;
          } catch (error) {
            logger.error(`日付: ${date}の処理でエラー:`, error);
            return false;
          }
        });

        // バッチ処理の結果を確認
        const batchResults = await Promise.all(batchPromises);
        const batchSuccess = batchResults.every(result => result === true);
        if (!batchSuccess) {
          logger.warn(`バッチ処理でエラーが発生しました: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目`);
          const failedIndices = batchResults.map((result, index) => !result ? index : -1).filter(index => index !== -1);
          logger.warn(`失敗した日程のインデックス: ${failedIndices.join(', ')}`);
          success = false;
        } else {
          logger.log(`バッチ処理成功: ${i+1}～${Math.min(i+BATCH_SIZE, dates.length)}日目`);
        }

        // 次のバッチ処理の前に少し待機（レート制限対策）
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      logger.log(`全シフト更新処理完了. 結果: ${success ? '成功' : '一部失敗'}`);
      return success;
    } catch (error) {
      logger.error('スタッフの全シフト一括更新に失敗しました:', error);
      throw error;
    }
  },

  // 6週間以上前のシフトデータを削除（管理者キー必須。自グループのみ対象）
  cleanupOldShifts: async (keys?: GroupSecretKeys) => {
    try {
      if (!keys?.adminKey) {
        return {
          success: false,
          error: '管理者キーが必要です',
          message: '管理者キーがないため古いシフトデータを削除できません'
        };
      }

      const { data, error } = await supabase.rpc('cleanup_old_shifts', {
        p_admin_key: keys.adminKey,
      });

      if (error) throw error;

      return {
        success: true,
        message: `${data ?? 0}件の古いシフトデータを削除しました`
      };
    } catch (error) {
      logger.error('Error cleaning up old shifts:', error);
      return {
        success: false,
        error: '古いシフトデータの削除に失敗しました',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました'
      };
    }
  },

  // シフト確定状態を取得
  async getShiftConfirmation(staffId: string, keys?: GroupSecretKeys): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const resolved = resolveSecret(keys);
      if (!resolved) {
        return { success: false, error: 'アクセスキーが必要です' };
      }

      const { data, error } = await supabase.rpc('get_shift_confirmation', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) throw error;

      return {
        success: true,
        data: { isConfirmed: data ?? false }
      };
    } catch (error) {
      logger.error('シフト確定状態の取得に失敗しました:', error);
      return { success: false, error: '確定状態の取得に失敗しました' };
    }
  },

  // シフトを確定
  async confirmShift(staffId: string, keys?: GroupSecretKeys): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const resolved = resolveSecret(keys);
      if (!resolved) {
        return { success: false, error: 'アクセスキーが必要です' };
      }

      const { data, error } = await supabase.rpc('set_shift_confirmation', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_confirmed: true,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) throw error;
      if (data !== true) {
        return { success: false, error: 'シフト確定に失敗しました' };
      }

      return {
        success: true,
        data: { isConfirmed: true }
      };
    } catch (error) {
      logger.error('シフト確定に失敗しました:', error);
      return { success: false, error: 'シフト確定に失敗しました' };
    }
  },

  // シフト確定を解除
  async unconfirmShift(staffId: string, keys?: GroupSecretKeys): Promise<{ success: boolean; data?: { isConfirmed: boolean }; error?: string }> {
    try {
      const resolved = resolveSecret(keys);
      if (!resolved) {
        return { success: false, error: 'アクセスキーが必要です' };
      }

      const { data, error } = await supabase.rpc('set_shift_confirmation', {
        p_secret: resolved.secret,
        p_staff_id: staffId,
        p_confirmed: false,
        p_is_admin_key: resolved.isAdminKey,
      });

      if (error) throw error;
      if (data !== true) {
        return { success: false, error: 'シフト確定解除に失敗しました' };
      }

      return {
        success: true,
        data: { isConfirmed: false }
      };
    } catch (error) {
      logger.error('シフト確定解除に失敗しました:', error);
      return { success: false, error: 'シフト確定解除に失敗しました' };
    }
  },
};
