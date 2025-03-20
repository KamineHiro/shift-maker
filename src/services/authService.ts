import { supabase } from '@/lib/supabase';
import { UserData, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const authService = {
  // 現在のユーザーを取得
  async getCurrentUser(): Promise<UserData | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }
      
      const user = session.user;
      
      // スタッフ情報を取得
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (staffError && staffError.code !== 'PGRST116') {
        console.error('スタッフ情報の取得に失敗しました:', staffError);
      }
      
      return {
        id: user.id,
        email: user.email || '',
        role: staffData?.role || 'staff',
        staffId: staffData?.id,
        name: staffData?.name
      };
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      return null;
    }
  },
  
  // メールアドレスとパスワードでログイン
  async signInWithEmail(email: string, password: string): Promise<UserData | null> {
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error || !session) {
        throw error || new Error('ログインに失敗しました');
      }
      
      const user = session.user;
      
      // スタッフ情報を取得
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (staffError && staffError.code !== 'PGRST116') {
        console.error('スタッフ情報の取得に失敗しました:', staffError);
      }
      
      return {
        id: user.id,
        email: user.email || '',
        role: staffData?.role || 'staff',
        staffId: staffData?.id,
        name: staffData?.name
      };
    } catch (error) {
      console.error('ログインに失敗しました:', error);
      throw error;
    }
  },
  
  // 新規ユーザー登録
  async signUp(email: string, password: string, name: string, role: UserRole): Promise<UserData | null> {
    try {
      // ユーザーを作成
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error || !user) {
        throw error || new Error('ユーザー登録に失敗しました');
      }
      
      // スタッフ情報を作成
      const staffId = uuidv4();
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert([{
          id: staffId,
          name,
          user_id: user.id,
          role
        }])
        .select()
        .maybeSingle();
      
      if (staffError) {
        console.error('スタッフ情報の作成に失敗しました:', staffError);
        // ユーザー作成に成功してもスタッフ情報の作成に失敗した場合は、ユーザーを削除
        await supabase.auth.admin.deleteUser(user.id);
        throw staffError;
      }
      
      return {
        id: user.id,
        email: user.email || '',
        role,
        staffId: staffData.id,
        name: staffData.name
      };
    } catch (error) {
      console.error('ユーザー登録に失敗しました:', error);
      throw error;
    }
  },
  
  // ログアウト
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      throw error;
    }
  }
}; 