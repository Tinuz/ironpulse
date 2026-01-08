import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Database = {
  public: {
    Tables: {
      schemas: {
        Row: {
          id: string
          user_id: string
          name: string
          exercises: any
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          exercises: any
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          exercises?: any
          color?: string | null
          created_at?: string
        }
      }
      workout_history: {
        Row: {
          id: string
          user_id: string
          schema_id: string | null
          name: string
          date: string
          start_time: number
          end_time: number | null
          exercises: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          schema_id?: string | null
          name: string
          date: string
          start_time: number
          end_time?: number | null
          exercises: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          schema_id?: string | null
          name?: string
          date?: string
          start_time?: number
          end_time?: number | null
          exercises?: any
          created_at?: string
        }
      }
      body_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          weight: number | null
          height: number | null
          age: number | null
          chest: number | null
          biceps: number | null
          waist: number | null
          thighs: number | null
          shoulders: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight?: number | null
          height?: number | null
          age?: number | null
          chest?: number | null
          biceps?: number | null
          waist?: number | null
          thighs?: number | null
          shoulders?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight?: number | null
          height?: number | null
          age?: number | null
          chest?: number | null
          biceps?: number | null
          waist?: number | null
          thighs?: number | null
          shoulders?: number | null
          created_at?: string
        }
      }
      nutrition_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          items: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          items: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          items?: any
          created_at?: string
        }
      }
      user_social_profiles: {
        Row: {
          id: string
          user_id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          is_public: boolean
          show_workouts: boolean
          show_achievements: boolean
          show_stats: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_public?: boolean
          show_workouts?: boolean
          show_achievements?: boolean
          show_stats?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_public?: boolean
          show_workouts?: boolean
          show_achievements?: boolean
          show_stats?: boolean
          updated_at?: string
        }
      }
      user_follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      workout_reactions: {
        Row: {
          id: string
          workout_id: string
          user_id: string
          reaction_type: 'fire' | 'strong' | 'clap' | 'beast'
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          user_id: string
          reaction_type: 'fire' | 'strong' | 'clap' | 'beast'
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          user_id?: string
          reaction_type?: 'fire' | 'strong' | 'clap' | 'beast'
          created_at?: string
        }
      }
      user_notification_state: {
        Row: {
          user_id: string
          last_checked_reactions: string
          updated_at: string
        }
        Insert: {
          user_id: string
          last_checked_reactions?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          last_checked_reactions?: string
          updated_at?: string
        }
      }
    }
  }
}
