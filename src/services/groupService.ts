import { supabase } from '@/lib/supabase';
import { Group, GroupAccess } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomString } from '@/utils/helpers';

export const groupService = {
  async createGroup(name: string, adminPassword: string): Promise<Group> {
    try {
      const id = uuidv4();
      const accessKey = generateRandomString(8);
      const adminKey = generateRandomString(8);

      const { data, error } = await supabase.rpc('create_group', {
        p_id: id,
        p_name: name,
        p_access_key: accessKey,
        p_admin_key: adminKey,
        p_admin_password: adminPassword,
      });

      if (error) {
        console.error('Supabaseエラー詳細:', error);
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('グループの作成に失敗しました');

      return {
        id: row.id,
        name: row.name,
        accessKey: row.access_key,
        adminKey: row.admin_key,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('グループの作成に失敗しました:', error);
      throw error;
    }
  },

  async getGroupByAccessKey(accessKey: string): Promise<GroupAccess> {
    try {
      const { data, error } = await supabase.rpc('get_group_by_access_key', {
        p_access_key: accessKey,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('グループが見つかりませんでした');

      return {
        groupId: row.id,
        groupName: row.name,
        isAdmin: false,
        accessKey: row.access_key,
      };
    } catch (error) {
      console.error('グループの取得に失敗しました:', error);
      throw error;
    }
  },

  async getGroupByAdminKey(adminKey: string): Promise<GroupAccess> {
    try {
      const { data, error } = await supabase.rpc('get_group_by_admin_key', {
        p_admin_key: adminKey,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('グループが見つかりませんでした');

      return {
        groupId: row.id,
        groupName: row.name,
        isAdmin: true,
        accessKey: row.access_key,
        adminKey: row.admin_key,
      };
    } catch (error) {
      console.error('グループの取得に失敗しました:', error);
      throw error;
    }
  },

  /** 管理者キーとパスワードが一致するか（groups 直参照は RLS で不可のため RPC） */
  async verifyAdminPassword(adminKey: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('verify_admin_password', {
        p_admin_key: adminKey,
        p_plain_password: password,
      });

      if (error) {
        console.error('管理者パスワードの検証に失敗しました:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('管理者パスワードの検証に失敗しました:', error);
      return false;
    }
  },
};
