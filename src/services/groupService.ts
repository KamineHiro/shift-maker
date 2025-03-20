import { supabase } from '@/lib/supabase';
import { Group, GroupAccess } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomString } from '@/utils/helpers';

export const groupService = {
  // 新しいグループを作成
  async createGroup(name: string, adminPassword: string): Promise<Group> {
    try {
      const id = uuidv4();
      const accessKey = generateRandomString(8); // 8文字のランダムな文字列
      const adminKey = generateRandomString(8); // 管理者用のキー
      
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          id,
          name,
          access_key: accessKey,
          admin_key: adminKey,
          admin_password: adminPassword // 管理者パスワードを保存
        }])
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('グループの作成に失敗しました');
      
      return {
        id: data.id,
        name: data.name,
        accessKey: data.access_key,
        adminKey: data.admin_key,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('グループの作成に失敗しました:', error);
      throw error;
    }
  },
  
  // アクセスキーでグループを取得
  async getGroupByAccessKey(accessKey: string): Promise<GroupAccess> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, access_key')
        .eq('access_key', accessKey)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('グループが見つかりませんでした');
      
      return {
        groupId: data.id,
        groupName: data.name,
        isAdmin: false,
        accessKey: data.access_key
      };
    } catch (error) {
      console.error('グループの取得に失敗しました:', error);
      throw error;
    }
  },
  
  // 管理者キーでグループを取得
  async getGroupByAdminKey(adminKey: string): Promise<GroupAccess> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, access_key, admin_key')
        .eq('admin_key', adminKey)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('グループが見つかりませんでした');
      
      return {
        groupId: data.id,
        groupName: data.name,
        isAdmin: true,
        accessKey: data.access_key,
        adminKey: data.admin_key
      };
    } catch (error) {
      console.error('グループの取得に失敗しました:', error);
      throw error;
    }
  },
  
  // 管理者パスワードを検証
  async verifyAdminPassword(groupId: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('admin_password')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      if (!data) return false;
      
      return data.admin_password === password;
    } catch (error) {
      console.error('管理者パスワードの検証に失敗しました:', error);
      return false;
    }
  }
}; 