import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

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
        console.error('Supabaseリクエストエラー:', err);
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

// サーバーサイドでのみ使用するクライアント
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: (...args) => {
          return fetch(...args).catch(err => {
            console.error('サーバーサイドSupabaseリクエストエラー:', err);
            throw err;
          });
        },
      },
    }
  );
}; 