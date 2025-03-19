// シフトデータの型定義
export interface ShiftData {
  id?: string;         // Supabaseのレコードid（プライマリーキー）
  staff_id: string;    // 旧バージョンとの互換性のために残す
  name: string;
  shifts: {
    [date: string]: ShiftInfo;
  };
}

export interface ShiftInfo {
  staff_id: string;  // 追加
  date: string; // ← 追加！
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  note?: string;
  isAllDay?: boolean;
}

// APIレスポンスの型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// グループ関連の型定義
export interface Group {
  id: string;
  name: string;
  accessKey: string;
  adminKey: string;
  createdAt: string;
}

export interface GroupAccess {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  accessKey?: string;
  adminKey?: string;
}

// ユーザー関連の型定義
export type UserRole = 'staff' | 'manager';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  staffId?: string;
} 