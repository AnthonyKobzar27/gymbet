-- ============================================================================
-- GymBet Database Schema
-- Complete database setup with RLS policies
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  email TEXT NOT NULL,
  username TEXT NULL,
  hash TEXT NOT NULL,
  user_id UUID NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  gender TEXT NULL,
  age NUMERIC NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (email),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles USING btree (user_id) TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION set_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_set_user_id ON public.profiles;
CREATE TRIGGER profiles_set_user_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_auth();

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  USING (true);

-- ============================================================================
-- 2. HASH_TO_VALUE TABLE (Balance tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hash_to_value (
  hash TEXT NOT NULL DEFAULT '0'::TEXT,
  value NUMERIC NOT NULL DEFAULT '0'::NUMERIC,
  CONSTRAINT hash_to_value_pkey PRIMARY KEY (hash)
) TABLESPACE pg_default;

-- RLS Policies for hash_to_value
ALTER TABLE public.hash_to_value ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own balance"
  ON public.hash_to_value FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert their own balance"
  ON public.hash_to_value FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own balance"
  ON public.hash_to_value FOR UPDATE
  USING (true);

-- ============================================================================
-- 3. BALANCE_AUDIT_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.balance_audit_log (
  id BIGSERIAL NOT NULL,
  user_hash TEXT NOT NULL,
  old_value NUMERIC NULL,
  new_value NUMERIC NULL,
  operation TEXT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT balance_audit_log_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- RLS Policies for balance_audit_log
ALTER TABLE public.balance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own audit logs"
  ON public.balance_audit_log FOR SELECT
  USING (true);

CREATE POLICY "Allow system to insert audit logs"
  ON public.balance_audit_log FOR INSERT
  WITH CHECK (true);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balance_audit_log (user_hash, old_value, new_value, operation)
  VALUES (
    NEW.hash,
    OLD.value,
    NEW.value,
    TG_OP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to hash_to_value
DROP TRIGGER IF EXISTS balance_change_audit ON public.hash_to_value;
CREATE TRIGGER balance_change_audit
  AFTER INSERT OR UPDATE ON public.hash_to_value
  FOR EACH ROW
  EXECUTE FUNCTION audit_balance_change();

-- ============================================================================
-- 4. GAMES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  split_type TEXT NOT NULL,
  stake NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE NULL,
  ended_at TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_player_count_check CHECK (
    (player_count >= 0) AND (player_count <= 8)
  ),
  CONSTRAINT games_status_check CHECK (
    status = ANY (ARRAY['joinable'::TEXT, 'active'::TEXT, 'completed'::TEXT])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_games_status_player_count
  ON public.games USING btree (status, player_count) TABLESPACE pg_default;

-- RLS Policies for games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to games"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create games"
  ON public.games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow system to update games"
  ON public.games FOR UPDATE
  USING (true);

-- ============================================================================
-- 5. GAME_PLAYERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  user_hash TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'::TEXT,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  last_submission_date DATE NULL,
  CONSTRAINT game_players_pkey PRIMARY KEY (id),
  CONSTRAINT game_players_game_id_user_hash_key UNIQUE (game_id, user_hash),
  CONSTRAINT game_players_game_id_fkey FOREIGN KEY (game_id)
    REFERENCES games (id) ON DELETE CASCADE,
  CONSTRAINT game_players_status_check CHECK (
    status = ANY (ARRAY['active'::TEXT, 'eliminated'::TEXT, 'winner'::TEXT])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_players_game_id
  ON public.game_players USING btree (game_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_players_user_hash
  ON public.game_players USING btree (user_hash) TABLESPACE pg_default;

-- RLS Policies for game_players
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to game players"
  ON public.game_players FOR SELECT
  USING (true);

CREATE POLICY "Allow users to join games"
  ON public.game_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow system to update game players"
  ON public.game_players FOR UPDATE
  USING (true);

CREATE POLICY "Allow users to leave games"
  ON public.game_players FOR DELETE
  USING (true);

-- ============================================================================
-- 6. GAME_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  user_hash TEXT NULL,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  photo_url TEXT NULL,
  CONSTRAINT game_logs_pkey PRIMARY KEY (id),
  CONSTRAINT game_logs_game_id_fkey FOREIGN KEY (game_id)
    REFERENCES games (id) ON DELETE CASCADE,
  CONSTRAINT game_logs_event_type_check CHECK (
    event_type = ANY (ARRAY[
      'join'::TEXT,
      'workout'::TEXT,
      'elimination'::TEXT,
      'win'::TEXT,
      'missed_workout'::TEXT,
      'game_start'::TEXT,
      'game_end'::TEXT,
      'chat'::TEXT,
      'proof'::TEXT
    ])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_logs_game_created
  ON public.game_logs USING btree (game_id, created_at DESC) TABLESPACE pg_default;

-- RLS Policies for game_logs
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to game logs"
  ON public.game_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create game logs"
  ON public.game_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. GAME_SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  user_hash TEXT NOT NULL,
  submission_date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_on_time BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT game_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT game_submissions_game_id_user_hash_submission_date_key
    UNIQUE (game_id, user_hash, submission_date),
  CONSTRAINT game_submissions_game_id_fkey FOREIGN KEY (game_id)
    REFERENCES games (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_submissions_game_date
  ON public.game_submissions USING btree (game_id, submission_date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_game_submissions_user
  ON public.game_submissions USING btree (user_hash, game_id) TABLESPACE pg_default;

-- RLS Policies for game_submissions
ALTER TABLE public.game_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to game submissions"
  ON public.game_submissions FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create submissions"
  ON public.game_submissions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 8. HOME_PAGE_TOP TABLE (User Stats)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.home_page_top (
  user_hash TEXT NOT NULL DEFAULT '0'::TEXT,
  workout_logged NUMERIC NULL DEFAULT '0'::NUMERIC,
  profit_made NUMERIC NULL DEFAULT '0'::NUMERIC,
  timestep TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  workout_history JSONB NULL DEFAULT '[]'::JSONB,
  profit_history JSONB NULL DEFAULT '[]'::JSONB,
  last_workout_log_date DATE NULL,
  current_split_day TEXT NULL DEFAULT 'No split set'::TEXT,
  CONSTRAINT home_page_top_pkey PRIMARY KEY (user_hash)
) TABLESPACE pg_default;

-- RLS Policies for home_page_top
ALTER TABLE public.home_page_top ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own stats"
  ON public.home_page_top FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert their own stats"
  ON public.home_page_top FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own stats"
  ON public.home_page_top FOR UPDATE
  USING (true);

-- ============================================================================
-- 9. ACTIVITY_LOG TABLE (PBFT Validation Feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id BIGSERIAL NOT NULL,
  user_hash TEXT NOT NULL DEFAULT '0'::TEXT,
  sender_hash TEXT NOT NULL DEFAULT '0'::TEXT,
  message TEXT NOT NULL DEFAULT ''::TEXT,
  typeofmessage TEXT NOT NULL DEFAULT 'workout'::TEXT,
  image TEXT NULL,
  timestep TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  validation_status TEXT NULL DEFAULT 'pending'::TEXT,
  total_validators INTEGER NULL DEFAULT 0,
  required_approvals INTEGER NULL DEFAULT 0,
  game_id UUID NULL,
  CONSTRAINT activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT activity_log_game_id_fkey FOREIGN KEY (game_id)
    REFERENCES games (id) ON DELETE SET NULL,
  CONSTRAINT activity_log_validation_status_check CHECK (
    validation_status = ANY (ARRAY['pending'::TEXT, 'approved'::TEXT, 'rejected'::TEXT])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_activity_log_user_hash
  ON public.activity_log USING btree (user_hash) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_activity_log_timestep
  ON public.activity_log USING btree (timestep DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_activity_log_game_id
  ON public.activity_log USING btree (game_id) TABLESPACE pg_default;

-- RLS Policies for activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to activity log"
  ON public.activity_log FOR SELECT
  USING (true);

CREATE POLICY "Allow users to insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow system to update activity logs"
  ON public.activity_log FOR UPDATE
  USING (true);

-- ============================================================================
-- 10. PROOF_DISTRIBUTION TABLE (PBFT Validator Assignment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proof_distribution (
  id SERIAL NOT NULL,
  activity_log_id INTEGER NOT NULL,
  validator_hash TEXT NOT NULL,
  has_voted BOOLEAN NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT proof_distribution_pkey PRIMARY KEY (id),
  CONSTRAINT proof_distribution_activity_log_id_validator_hash_key
    UNIQUE (activity_log_id, validator_hash),
  CONSTRAINT proof_distribution_activity_log_id_fkey FOREIGN KEY (activity_log_id)
    REFERENCES activity_log (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_proof_distribution_activity_log_id
  ON public.proof_distribution USING btree (activity_log_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_proof_distribution_validator_hash
  ON public.proof_distribution USING btree (validator_hash) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_proof_distribution_validator_unvoted
  ON public.proof_distribution USING btree (validator_hash, has_voted) TABLESPACE pg_default
  WHERE (has_voted = false);

-- RLS Policies for proof_distribution
ALTER TABLE public.proof_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow validators to view their assigned proofs"
  ON public.proof_distribution FOR SELECT
  USING (true);

CREATE POLICY "Allow system to assign proofs to validators"
  ON public.proof_distribution FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow system to update proof distribution"
  ON public.proof_distribution FOR UPDATE
  USING (true);

-- ============================================================================
-- 11. PROOF_VOTES TABLE (PBFT Voting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proof_votes (
  id SERIAL NOT NULL,
  activity_log_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT proof_votes_pkey PRIMARY KEY (id),
  CONSTRAINT proof_votes_activity_log_id_voter_hash_key
    UNIQUE (activity_log_id, voter_hash),
  CONSTRAINT proof_votes_activity_log_id_fkey FOREIGN KEY (activity_log_id)
    REFERENCES activity_log (id) ON DELETE CASCADE,
  CONSTRAINT proof_votes_vote_type_check CHECK (
    vote_type = ANY (ARRAY['approve'::TEXT, 'reject'::TEXT])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_proof_votes_activity_log_id
  ON public.proof_votes USING btree (activity_log_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_proof_votes_voter_hash
  ON public.proof_votes USING btree (voter_hash) TABLESPACE pg_default;

-- RLS Policies for proof_votes
ALTER TABLE public.proof_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to votes"
  ON public.proof_votes FOR SELECT
  USING (true);

CREATE POLICY "Allow validators to vote"
  ON public.proof_votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow validators to update their votes"
  ON public.proof_votes FOR UPDATE
  USING (true);

CREATE POLICY "Allow validators to delete their votes"
  ON public.proof_votes FOR DELETE
  USING (true);

-- ============================================================================
-- 12. TRANSACTIONS TABLE (Financial History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL NOT NULL,
  user_hash TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_type_check CHECK (
    type = ANY (ARRAY['deposit'::TEXT, 'withdrawal'::TEXT, 'stake'::TEXT, 'payout'::TEXT])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_transactions_user_hash
  ON public.transactions USING btree (user_hash) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON public.transactions USING btree (created_at DESC) TABLESPACE pg_default;

-- RLS Policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own transactions"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Allow system to insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for workout proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-proofs', 'workout-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for workout-proofs bucket
CREATE POLICY "Public access to workout proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workout-proofs');

CREATE POLICY "Authenticated users can upload workout proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workout-proofs');

CREATE POLICY "Users can update their own workout proofs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'workout-proofs');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Database setup complete!
--
-- Tables created:
-- 1. profiles - User profiles and authentication
-- 2. hash_to_value - User balances
-- 3. balance_audit_log - Balance change tracking
-- 4. games - Workout split betting games
-- 5. game_players - Players in games
-- 6. game_logs - Game activity logs
-- 7. game_submissions - Daily workout proof submissions
-- 8. home_page_top - User statistics dashboard
-- 9. activity_log - PBFT validation activity feed
-- 10. proof_distribution - PBFT validator assignments
-- 11. proof_votes - PBFT validator votes
-- 12. transactions - Financial transaction history
--
-- All tables have RLS policies enabled for security
-- Storage bucket 'workout-proofs' created for photo uploads
-- ============================================================================
