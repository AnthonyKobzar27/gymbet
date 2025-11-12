-- ============================================================================
-- MIGRATION SCRIPT: Snooze App → GymBet
-- Migrates existing data from old schema to new schema
-- ============================================================================
--
-- IMPORTANT: Run this AFTER creating the new tables with gymbet_schema.sql
-- This script assumes both old and new tables exist
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Migrate PROFILES (no changes)
-- ============================================================================
INSERT INTO public.profiles (email, username, hash)
SELECT email, username, hash
FROM public.profiles_old
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 2. Migrate HASH_TO_VALUE (no changes)
-- ============================================================================
INSERT INTO public.hash_to_value (hash, value)
SELECT hash, value
FROM public.hash_to_value_old
ON CONFLICT (hash) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- 3. Migrate BALANCE_AUDIT_LOG (no changes)
-- ============================================================================
INSERT INTO public.balance_audit_log (user_hash, old_value, new_value, operation, timestamp)
SELECT user_hash, old_value, new_value, operation, timestamp
FROM public.balance_audit_log_old;

-- ============================================================================
-- 4. Migrate GAMES
-- Convert wake_up_time to split_type
-- ============================================================================
INSERT INTO public.games (
  id,
  split_type,
  stake,
  status,
  player_count,
  created_at,
  started_at,
  ended_at
)
SELECT
  id,
  -- Convert time to a default split type (you may want to customize this)
  CASE
    WHEN EXTRACT(HOUR FROM wake_up_time) < 9 THEN 'Push Day'
    WHEN EXTRACT(HOUR FROM wake_up_time) < 14 THEN 'Pull Day'
    ELSE 'Leg Day'
  END as split_type,
  stake,
  status,
  player_count,
  created_at,
  started_at,
  ended_at
FROM public.games_old
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Migrate GAME_PLAYERS
-- Rename total_wakeups to total_workouts
-- ============================================================================
INSERT INTO public.game_players (
  id,
  game_id,
  user_hash,
  joined_at,
  status,
  total_workouts,
  last_submission_date
)
SELECT
  id,
  game_id,
  user_hash,
  joined_at,
  status,
  total_wakeups as total_workouts,
  last_submission_date
FROM public.game_players_old
ON CONFLICT (game_id, user_hash) DO NOTHING;

-- ============================================================================
-- 6. Migrate GAME_LOGS
-- Update event types from wakeup → workout
-- ============================================================================
INSERT INTO public.game_logs (
  id,
  game_id,
  user_hash,
  message,
  event_type,
  created_at,
  photo_url
)
SELECT
  id,
  game_id,
  user_hash,
  -- Update message text
  REPLACE(REPLACE(message, 'wakeup', 'workout'), 'wake up', 'workout') as message,
  -- Update event types
  CASE
    WHEN event_type = 'wakeup' THEN 'workout'
    WHEN event_type = 'missed_wakeup' THEN 'missed_workout'
    ELSE event_type
  END as event_type,
  created_at,
  photo_url
FROM public.game_logs_old
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. Migrate GAME_SUBMISSIONS (no schema changes)
-- ============================================================================
INSERT INTO public.game_submissions (
  id,
  game_id,
  user_hash,
  submission_date,
  photo_url,
  submitted_at,
  is_on_time,
  verified
)
SELECT
  id,
  game_id,
  user_hash,
  submission_date,
  photo_url,
  submitted_at,
  is_on_time,
  verified
FROM public.game_submissions_old
ON CONFLICT (game_id, user_hash, submission_date) DO NOTHING;

-- ============================================================================
-- 8. Migrate HOME_PAGE_TOP
-- Rename sleep fields to workout fields
-- ============================================================================
INSERT INTO public.home_page_top (
  user_hash,
  workout_logged,
  profit_made,
  timestep,
  workout_history,
  profit_history,
  last_workout_log_date,
  current_split_day
)
SELECT
  user_hash,
  sleep_logged as workout_logged,
  profit_made,
  timestep,
  sleep_history as workout_history,
  profit_history,
  last_sleep_log_date as last_workout_log_date,
  'No split set' as current_split_day
FROM public.home_page_top_old
ON CONFLICT (user_hash) DO UPDATE SET
  workout_logged = EXCLUDED.workout_logged,
  profit_made = EXCLUDED.profit_made,
  workout_history = EXCLUDED.workout_history,
  profit_history = EXCLUDED.profit_history,
  last_workout_log_date = EXCLUDED.last_workout_log_date;

-- ============================================================================
-- 9. Migrate ACTIVITY_LOG
-- Update typeofmessage from wakeup to workout
-- ============================================================================
INSERT INTO public.activity_log (
  id,
  user_hash,
  sender_hash,
  message,
  typeofmessage,
  image,
  timestep,
  validation_status,
  total_validators,
  required_approvals,
  game_id
)
SELECT
  id,
  user_hash,
  sender_hash,
  -- Update message text
  REPLACE(REPLACE(message, 'wakeup', 'workout'), 'wake up', 'workout') as message,
  -- Update message type
  CASE
    WHEN typeofmessage = 'wakeup' THEN 'workout'
    ELSE typeofmessage
  END as typeofmessage,
  image,
  timestep,
  validation_status,
  total_validators,
  required_approvals,
  game_id
FROM public.activity_log_old
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for activity_log
SELECT setval('activity_log_id_seq', (SELECT MAX(id) FROM public.activity_log));

-- ============================================================================
-- 10. Migrate PROOF_DISTRIBUTION (no changes)
-- ============================================================================
INSERT INTO public.proof_distribution (
  id,
  activity_log_id,
  validator_hash,
  has_voted,
  created_at
)
SELECT
  id,
  activity_log_id,
  validator_hash,
  has_voted,
  created_at
FROM public.proof_distribution_old
ON CONFLICT (activity_log_id, validator_hash) DO NOTHING;

-- Reset sequence for proof_distribution
SELECT setval('proof_distribution_id_seq', (SELECT MAX(id) FROM public.proof_distribution));

-- ============================================================================
-- 11. Migrate PROOF_VOTES (no changes)
-- ============================================================================
INSERT INTO public.proof_votes (
  id,
  activity_log_id,
  voter_hash,
  vote_type,
  created_at,
  updated_at
)
SELECT
  id,
  activity_log_id,
  voter_hash,
  vote_type,
  created_at,
  updated_at
FROM public.proof_votes_old
ON CONFLICT (activity_log_id, voter_hash) DO NOTHING;

-- Reset sequence for proof_votes
SELECT setval('proof_votes_id_seq', (SELECT MAX(id) FROM public.proof_votes));

-- ============================================================================
-- 12. Migrate TRANSACTIONS (no changes)
-- ============================================================================
INSERT INTO public.transactions (
  id,
  user_hash,
  type,
  amount,
  description,
  created_at
)
SELECT
  id,
  user_hash,
  type,
  -- Update descriptions to replace sleep/wakeup references
  REPLACE(REPLACE(description, 'wakeup', 'workout'), 'sleep', 'workout') as description,
  amount,
  created_at
FROM public.transactions_old;

-- Reset sequence for transactions
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM public.transactions));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify data integrity

-- Check table counts match
DO $$
DECLARE
  table_name TEXT;
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'profiles', 'hash_to_value', 'balance_audit_log', 'games',
      'game_players', 'game_logs', 'game_submissions', 'home_page_top',
      'activity_log', 'proof_distribution', 'proof_votes', 'transactions'
    ])
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I_old', table_name) INTO old_count;
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO new_count;
    RAISE NOTICE 'Table %: Old = %, New = %', table_name, old_count, new_count;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION CLEANUP (Optional - Run after verifying migration)
-- ============================================================================

-- Uncomment these lines to drop old tables after successful migration
-- WARNING: This will permanently delete your old data!

/*
DROP TABLE IF EXISTS public.transactions_old CASCADE;
DROP TABLE IF EXISTS public.proof_votes_old CASCADE;
DROP TABLE IF EXISTS public.proof_distribution_old CASCADE;
DROP TABLE IF EXISTS public.activity_log_old CASCADE;
DROP TABLE IF EXISTS public.home_page_top_old CASCADE;
DROP TABLE IF EXISTS public.game_submissions_old CASCADE;
DROP TABLE IF EXISTS public.game_logs_old CASCADE;
DROP TABLE IF EXISTS public.game_players_old CASCADE;
DROP TABLE IF EXISTS public.games_old CASCADE;
DROP TABLE IF EXISTS public.balance_audit_log_old CASCADE;
DROP TABLE IF EXISTS public.hash_to_value_old CASCADE;
DROP TABLE IF EXISTS public.profiles_old CASCADE;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
