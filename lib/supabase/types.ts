export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          elo_rating: number
          wins: number
          losses: number
          draws: number
          games_played: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          elo_rating?: number
          wins?: number
          losses?: number
          draws?: number
          games_played?: number
        }
        Update: {
          username?: string
          avatar_url?: string | null
          elo_rating?: number
          wins?: number
          losses?: number
          draws?: number
          games_played?: number
        }
        Relationships: []
      }
      games: {
        Row: {
          id: string
          player_white: string
          player_black: string | null
          fen: string
          moves: Json
          pgn: string | null
          status: 'waiting' | 'active' | 'completed' | 'abandoned'
          result: 'white' | 'black' | 'draw' | null
          time_control: string
          white_time_ms: number
          black_time_ms: number
          is_ai_game: boolean
          ai_difficulty: number
          board_theme: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          player_white: string
          player_black?: string | null
          fen?: string
          moves?: Json
          status?: 'waiting' | 'active' | 'completed' | 'abandoned'
          result?: 'white' | 'black' | 'draw' | null
          time_control: string
          white_time_ms: number
          black_time_ms: number
          is_ai_game?: boolean
          ai_difficulty?: number
          board_theme?: string
        }
        Update: {
          player_black?: string | null
          fen?: string
          moves?: Json
          pgn?: string | null
          status?: 'waiting' | 'active' | 'completed' | 'abandoned'
          result?: 'white' | 'black' | 'draw' | null
          white_time_ms?: number
          black_time_ms?: number
          board_theme?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      moves: {
        Row: {
          id: string
          game_id: string
          player_id: string
          move_san: string
          move_from: string
          move_to: string
          fen_after: string
          move_number: number
          color: 'w' | 'b'
          time_taken_ms: number | null
          created_at: string
        }
        Insert: {
          game_id: string
          player_id: string
          move_san: string
          move_from: string
          move_to: string
          fen_after: string
          move_number: number
          color: 'w' | 'b'
          time_taken_ms?: number | null
        }
        Update: never
        Relationships: []
      }
      matchmaking_queue: {
        Row: {
          player_id: string
          time_control: string
          elo_rating: number
          joined_at: string
          last_seen_at: string
        }
        Insert: {
          player_id: string
          time_control: string
          elo_rating: number
          joined_at?: string
          last_seen_at?: string
        }
        Update: {
          time_control?: string
          elo_rating?: number
          joined_at?: string
          last_seen_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type Move = Database['public']['Tables']['moves']['Row']
