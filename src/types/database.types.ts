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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      get_staff_list: {
        Args: { p_secret: string; p_is_admin_key?: boolean }
        Returns: {
          id: string
          name: string
          user_id: string | null
          role: 'staff' | 'manager'
          created_at: string
          group_id: string | null
          is_shift_confirmed: boolean
        }[]
      }
      get_staff: {
        Args: { p_secret: string; p_staff_id: string; p_is_admin_key?: boolean }
        Returns: {
          id: string
          name: string
          user_id: string | null
          role: 'staff' | 'manager'
          created_at: string
          group_id: string | null
          is_shift_confirmed: boolean
        }[]
      }
      add_staff: {
        Args: { p_admin_key: string; p_name: string }
        Returns: {
          id: string
          name: string
          user_id: string | null
          role: 'staff' | 'manager'
          created_at: string
          group_id: string | null
          is_shift_confirmed: boolean
        }[]
      }
      update_staff_name: {
        Args: { p_admin_key: string; p_staff_id: string; p_name: string }
        Returns: {
          id: string
          name: string
          user_id: string | null
          role: 'staff' | 'manager'
          created_at: string
          group_id: string | null
          is_shift_confirmed: boolean
        }[]
      }
      delete_staff: {
        Args: { p_admin_key: string; p_staff_id: string }
        Returns: boolean
      }
      get_shift: {
        Args: {
          p_secret: string
          p_staff_id: string
          p_date: string
          p_is_admin_key?: boolean
        }
        Returns: {
          id: string
          staff_id: string
          date: string
          start_time: string | null
          end_time: string | null
          is_off: boolean
          created_at: string
          note: string | null
          group_id: string | null
        }[]
      }
      get_staff_shifts: {
        Args: { p_secret: string; p_staff_id: string; p_is_admin_key?: boolean }
        Returns: {
          id: string
          staff_id: string
          date: string
          start_time: string | null
          end_time: string | null
          is_off: boolean
          created_at: string
          note: string | null
          group_id: string | null
        }[]
      }
      upsert_shift: {
        Args: {
          p_secret: string
          p_staff_id: string
          p_date: string
          p_start_time: string
          p_end_time: string
          p_is_off: boolean
          p_note: string
          p_is_admin_key?: boolean
          p_preserve_existing_note?: boolean
        }
        Returns: {
          id: string
          staff_id: string
          date: string
          start_time: string | null
          end_time: string | null
          is_off: boolean
          created_at: string
          note: string | null
          group_id: string | null
        }[]
      }
      delete_shift: {
        Args: {
          p_secret: string
          p_staff_id: string
          p_date: string
          p_is_admin_key?: boolean
        }
        Returns: boolean
      }
      get_shift_confirmation: {
        Args: { p_secret: string; p_staff_id: string; p_is_admin_key?: boolean }
        Returns: boolean
      }
      set_shift_confirmation: {
        Args: {
          p_secret: string
          p_staff_id: string
          p_confirmed: boolean
          p_is_admin_key?: boolean
        }
        Returns: boolean
      }
      cleanup_old_shifts: {
        Args: { p_admin_key: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
