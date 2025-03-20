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
        }
        Insert: {
          id?: string
          name: string
          user_id?: string | null
          role?: 'staff' | 'manager'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string | null
          role?: 'staff' | 'manager'
          created_at?: string
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
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          start_time?: string | null
          end_time?: string | null
          is_off: boolean
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          start_time?: string | null
          end_time?: string | null
          is_off?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 