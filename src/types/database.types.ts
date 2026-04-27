export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          access_key: string
          admin_key: string
          admin_password: string
          created_at: string
          shift_start_date: string | null
          shift_days: number | null
          owner_id: number
        }
        Insert: {
          id?: string
          name: string
          access_key: string
          admin_key: string
          admin_password: string
          created_at?: string
          shift_start_date?: string | null
          shift_days?: number | null
          owner_id: number
        }
        Update: {
          id?: string
          name?: string
          access_key?: string
          admin_key?: string
          admin_password?: string
          created_at?: string
          shift_start_date?: string | null
          shift_days?: number | null
          owner_id?: number
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          user_id: string | null
          role: 'staff' | 'manager'
          created_at: string
          group_id: string | null
          is_shift_confirmed: boolean
        }
        Insert: {
          id?: string
          name: string
          user_id?: string | null
          role?: 'staff' | 'manager'
          created_at?: string
          group_id?: string | null
          is_shift_confirmed?: boolean
        }
        Update: {
          id?: string
          name?: string
          user_id?: string | null
          role?: 'staff' | 'manager'
          created_at?: string
          group_id?: string | null
          is_shift_confirmed?: boolean
        }
      }
      shifts: {
        Row: {
          id: string
          staff_id: string
          date: string
          start_time: string | null
          end_time: string | null
          is_off: boolean
          created_at: string
          note: string | null
          group_id: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          start_time?: string | null
          end_time?: string | null
          is_off: boolean
          created_at?: string
          note?: string | null
          group_id?: string | null
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          start_time?: string | null
          end_time?: string | null
          is_off?: boolean
          created_at?: string
          note?: string | null
          group_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group: {
        Args: {
          p_id: string
          p_name: string
          p_access_key: string
          p_admin_key: string
          p_admin_password: string
        }
        Returns: {
          id: string
          name: string
          access_key: string
          admin_key: string
          created_at: string
        }[]
      }
      get_group_by_access_key: {
        Args: { p_access_key: string }
        Returns: {
          id: string
          name: string
          access_key: string
        }[]
      }
      get_group_by_admin_key: {
        Args: { p_admin_key: string }
        Returns: {
          id: string
          name: string
          access_key: string
        }[]
      }
      get_group_shift_schedule: {
        Args: { p_secret: string; p_is_admin_key?: boolean }
        Returns: {
          shift_start_date: string | null
          shift_days: number | null
        }[]
      }
      update_group_shift_schedule: {
        Args: {
          p_admin_key: string
          p_start_date: string
          p_shift_days: number
        }
        Returns: boolean
      }
      verify_admin_password: {
        Args: { p_admin_key: string; p_plain_password: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
