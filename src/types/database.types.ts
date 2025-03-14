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