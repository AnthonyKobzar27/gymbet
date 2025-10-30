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
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          is_public: boolean
          allow_friend_requests: boolean
          total_games_played: number
          total_games_won: number
          total_winnings: number
          current_streak: number
          longest_streak: number
          email_verified: boolean
          phone_verified: boolean
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
          allow_friend_requests?: boolean
          total_games_played?: number
          total_games_won?: number
          total_winnings?: number
          current_streak?: number
          longest_streak?: number
          email_verified?: boolean
          phone_verified?: boolean
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
          is_public?: boolean
          allow_friend_requests?: boolean
          total_games_played?: number
          total_games_won?: number
          total_winnings?: number
          current_streak?: number
          longest_streak?: number
          email_verified?: boolean
          phone_verified?: boolean
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance_cents: number
          encrypted_stripe_customer_id: string | null
          encrypted_payment_methods: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_cents?: number
          encrypted_stripe_customer_id?: string | null
          encrypted_payment_methods?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_cents?: number
          encrypted_stripe_customer_id?: string | null
          encrypted_payment_methods?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          type: 'deposit' | 'withdrawal' | 'stake' | 'win' | 'loss' | 'refund'
          amount_cents: number
          description: string
          stripe_payment_intent_id: string | null
          game_id: string | null
          status: 'pending' | 'completed' | 'failed' | 'cancelled'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          type: 'deposit' | 'withdrawal' | 'stake' | 'win' | 'loss' | 'refund'
          amount_cents: number
          description: string
          stripe_payment_intent_id?: string | null
          game_id?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'cancelled'
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_id?: string
          type?: 'deposit' | 'withdrawal' | 'stake' | 'win' | 'loss' | 'refund'
          amount_cents?: number
          description?: string
          stripe_payment_intent_id?: string | null
          game_id?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'cancelled'
          metadata?: Json
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          template_id: string | null
          creator_id: string
          title: string
          description: string | null
          category: string
          start_time: string
          end_time: string
          verification_deadline: string | null
          stake_amount_cents: number
          total_pot_cents: number
          max_participants: number
          requires_photo: boolean
          requires_location: boolean
          target_location: unknown | null
          location_radius_meters: number
          status: 'draft' | 'open' | 'active' | 'verification' | 'completed' | 'cancelled'
          winner_count: number
          total_participants: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          creator_id: string
          title: string
          description?: string | null
          category: string
          start_time: string
          end_time: string
          verification_deadline?: string | null
          stake_amount_cents: number
          total_pot_cents?: number
          max_participants?: number
          requires_photo?: boolean
          requires_location?: boolean
          target_location?: unknown | null
          location_radius_meters?: number
          status?: 'draft' | 'open' | 'active' | 'verification' | 'completed' | 'cancelled'
          winner_count?: number
          total_participants?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          creator_id?: string
          title?: string
          description?: string | null
          category?: string
          start_time?: string
          end_time?: string
          verification_deadline?: string | null
          stake_amount_cents?: number
          total_pot_cents?: number
          max_participants?: number
          requires_photo?: boolean
          requires_location?: boolean
          target_location?: unknown | null
          location_radius_meters?: number
          status?: 'draft' | 'open' | 'active' | 'verification' | 'completed' | 'cancelled'
          winner_count?: number
          total_participants?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      game_participants: {
        Row: {
          id: string
          game_id: string
          user_id: string
          stake_amount_cents: number
          joined_at: string
          submitted_proof: boolean
          proof_photo_url: string | null
          proof_location: unknown | null
          proof_timestamp: string | null
          proof_notes: string | null
          is_winner: boolean
          winnings_cents: number
          status: 'active' | 'completed' | 'disqualified' | 'refunded'
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          stake_amount_cents: number
          joined_at?: string
          submitted_proof?: boolean
          proof_photo_url?: string | null
          proof_location?: unknown | null
          proof_timestamp?: string | null
          proof_notes?: string | null
          is_winner?: boolean
          winnings_cents?: number
          status?: 'active' | 'completed' | 'disqualified' | 'refunded'
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string
          stake_amount_cents?: number
          joined_at?: string
          submitted_proof?: boolean
          proof_photo_url?: string | null
          proof_location?: unknown | null
          proof_timestamp?: string | null
          proof_notes?: string | null
          is_winner?: boolean
          winnings_cents?: number
          status?: 'active' | 'completed' | 'disqualified' | 'refunded'
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          type: 'game_created' | 'game_joined' | 'game_won' | 'game_lost' | 'friend_added' | 'achievement_unlocked'
          title: string
          description: string | null
          game_id: string | null
          target_user_id: string | null
          metadata: Json
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'game_created' | 'game_joined' | 'game_won' | 'game_lost' | 'friend_added' | 'achievement_unlocked'
          title: string
          description?: string | null
          game_id?: string | null
          target_user_id?: string | null
          metadata?: Json
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'game_created' | 'game_joined' | 'game_won' | 'game_lost' | 'friend_added' | 'achievement_unlocked'
          title?: string
          description?: string | null
          game_id?: string | null
          target_user_id?: string | null
          metadata?: Json
          is_public?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'game_reminder' | 'game_result' | 'friend_request' | 'payment_received' | 'verification_required'
          title: string
          message: string
          game_id: string | null
          from_user_id: string | null
          is_read: boolean
          is_pushed: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'game_reminder' | 'game_result' | 'friend_request' | 'payment_received' | 'verification_required'
          title: string
          message: string
          game_id?: string | null
          from_user_id?: string | null
          is_read?: boolean
          is_pushed?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'game_reminder' | 'game_result' | 'friend_request' | 'payment_received' | 'verification_required'
          title?: string
          message?: string
          game_id?: string | null
          from_user_id?: string | null
          is_read?: boolean
          is_pushed?: boolean
          metadata?: Json
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


