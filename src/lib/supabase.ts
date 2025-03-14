import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// 環境変数からSupabaseの接続情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// サーバーサイドでのみ使用するクライアント
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
      }
    }
  );
}; 