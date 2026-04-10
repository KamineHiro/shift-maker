import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { logger } from '@/lib/logger';

// 環境変数からSupabaseの接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの作成
// 認証は共有キー（GroupContext）のみ。Supabase Auth は未使用のためセッション保持しない。
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(err => {
        logger.error('Supabaseリクエストエラー:', err);
        throw err;
      });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});