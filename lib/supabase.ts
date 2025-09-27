import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          storage_usage_gb: number
          max_users: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          storage_usage_gb?: number
          max_users?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          storage_usage_gb?: number
          max_users?: number
          status?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string
          email: string
          first_name: string
          last_name: string
          role: string
          avatar: string | null
          phone: string | null
          mfa_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          first_name: string
          last_name: string
          role: string
          avatar?: string | null
          phone?: string | null
          mfa_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: string
          avatar?: string | null
          phone?: string | null
          mfa_enabled?: boolean
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          company_id: string
          name: string
          location_address: string
          location_lat: number
          location_lng: number
          budget: number
          spent: number
          actual_cost: number
          start_date: string
          end_date: string | null
          status: string
          image_url: string | null
          project_type: string
          work_classification: string
          geofence_radius: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          location_address: string
          location_lat: number
          location_lng: number
          budget: number
          spent?: number
          actual_cost?: number
          start_date: string
          end_date?: string | null
          status?: string
          image_url?: string | null
          project_type: string
          work_classification: string
          geofence_radius?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          location_address?: string
          location_lat?: number
          location_lng?: number
          budget?: number
          spent?: number
          actual_cost?: number
          start_date?: string
          end_date?: string | null
          status?: string
          image_url?: string | null
          project_type?: string
          work_classification?: string
          geofence_radius?: number
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          priority: string
          assignee_id: string | null
          due_date: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          project_id: string
          category: string
          amount: number
          description: string
          date: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          category: string
          amount: number
          description: string
          date: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string
          category?: string
          amount?: number
          description?: string
          date?: string
          updated_at?: string
        }
      }
    }
  }
}