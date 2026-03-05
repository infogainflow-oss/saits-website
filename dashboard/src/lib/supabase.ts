import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Client {
  id: string
  company_name: string
  email: string
  user_role: 'client' | 'team'
  created_at: string
  updated_at: string
}

export interface Execution {
  id: string
  client_id: string
  automation_type_id?: string
  name: string
  description?: string
  status: 'success' | 'failed' | 'in_progress'
  time_saved_hours?: number
  money_saved?: number
  executed_at: string
  completed_at?: string
  metadata?: Record<string, any>
  logged_by?: string
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description?: string
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold'
  progress: number
  due_date?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface AutomationType {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  time_saved_hours: number
  money_saved: number
  features?: string[]
  created_at: string
  updated_at: string
}
