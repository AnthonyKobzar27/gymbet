-- ============================================================================
-- CRITICAL SECURITY FIX MIGRATION
-- This migration fixes ALL security vulnerabilities in the database
-- ============================================================================

-- ============================================================================
-- STEP 1: Add user_id column to link records to Supabase Auth
-- ============================================================================

-- Add user_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to hash_to_value table (CRITICAL for balance security)
ALTER TABLE public.hash_to_value
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to home_page_top table
ALTER TABLE public.home_page_top
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_hash_to_value_user_id ON public.hash_to_value(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_home_page_top_user_id ON public.home_page_top(user_id);

-- ============================================================================
-- STEP 2: Create webhook_events table for idempotency
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  user_hash TEXT,
  amount NUMERIC,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id
  ON public.webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON public.webhook_events(processed_at DESC);

-- RLS for webhook_events (service role only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_service_only" ON public.webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 3: Drop old insecure RLS policies
-- ============================================================================

-- Drop old hash_to_value policies
DROP POLICY IF EXISTS "Allow users to view their own balance" ON public.hash_to_value;
DROP POLICY IF EXISTS "Allow users to insert their own balance" ON public.hash_to_value;
DROP POLICY IF EXISTS "Allow users to update their own balance" ON public.hash_to_value;
DROP POLICY IF EXISTS "hash_to_value_select_policy" ON public.hash_to_value;
DROP POLICY IF EXISTS "hash_to_value_insert_policy" ON public.hash_to_value;
DROP POLICY IF EXISTS "hash_to_value_update_policy" ON public.hash_to_value;

-- Drop old transactions policies
DROP POLICY IF EXISTS "Allow users to view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow system to insert transactions" ON public.transactions;

-- Drop old profiles policies
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Drop old home_page_top policies
DROP POLICY IF EXISTS "Allow users to view their own stats" ON public.home_page_top;
DROP POLICY IF EXISTS "Allow users to insert their own stats" ON public.home_page_top;
DROP POLICY IF EXISTS "Allow users to update their own stats" ON public.home_page_top;
DROP POLICY IF EXISTS "home_page_top_select_policy" ON public.home_page_top;
DROP POLICY IF EXISTS "home_page_top_insert_policy" ON public.home_page_top;
DROP POLICY IF EXISTS "home_page_top_update_policy" ON public.home_page_top;

-- Drop old balance_audit_log policies
DROP POLICY IF EXISTS "Allow users to view their own audit logs" ON public.balance_audit_log;
DROP POLICY IF EXISTS "Allow system to insert audit logs" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_service_only" ON public.balance_audit_log;

-- ============================================================================
-- STEP 4: Create SECURE RLS policies using auth.uid()
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE - User can only see/edit their own profile
-- ============================================================================

-- Users can read all profiles (for leaderboards, username lookup)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for migrations, admin tasks)
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HASH_TO_VALUE TABLE - CRITICAL: Users can ONLY access their own balance
-- ============================================================================

-- Users can ONLY read their own balance
CREATE POLICY "balance_select_own" ON public.hash_to_value
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can ONLY insert their own balance
CREATE POLICY "balance_insert_own" ON public.hash_to_value
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can ONLY update their own balance
CREATE POLICY "balance_update_own" ON public.hash_to_value
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for webhook deposits, admin actions)
CREATE POLICY "balance_service_all" ON public.hash_to_value
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRANSACTIONS TABLE - Users can only see their own transactions
-- ============================================================================

-- Users can ONLY read their own transactions
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert transactions (via Edge Functions)
CREATE POLICY "transactions_insert_service" ON public.transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can do anything
CREATE POLICY "transactions_service_all" ON public.transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HOME_PAGE_TOP TABLE - Users can only access their own stats
-- ============================================================================

-- Users can read all stats (for leaderboard)
CREATE POLICY "home_page_top_select_all" ON public.home_page_top
  FOR SELECT
  USING (true);

-- Users can only insert their own stats
CREATE POLICY "home_page_top_insert_own" ON public.home_page_top
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own stats
CREATE POLICY "home_page_top_update_own" ON public.home_page_top
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "home_page_top_service_all" ON public.home_page_top
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- BALANCE_AUDIT_LOG TABLE - Only service role can access
-- ============================================================================

CREATE POLICY "audit_log_select_service" ON public.balance_audit_log
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "audit_log_insert_service" ON public.balance_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- STEP 5: Create helper function to get user_id from hash (for migration)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_id_from_hash(user_hash TEXT)
RETURNS UUID AS $$
DECLARE
  result_user_id UUID;
BEGIN
  SELECT user_id INTO result_user_id
  FROM profiles
  WHERE hash = user_hash
  LIMIT 1;

  RETURN result_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create function to safely update balance with transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION update_balance_atomic(
  p_user_id UUID,
  p_user_hash TEXT,
  p_delta NUMERIC,
  p_transaction_type TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id BIGINT;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT value INTO v_current_balance
  FROM hash_to_value
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + p_delta;

  -- Check for negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Update or insert balance
  INSERT INTO hash_to_value (user_id, hash, value)
  VALUES (p_user_id, p_user_hash, v_new_balance)
  ON CONFLICT (hash)
  DO UPDATE SET
    value = v_new_balance,
    user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO transactions (user_id, user_hash, type, amount, description)
  VALUES (p_user_id, p_user_hash, p_transaction_type, ABS(p_delta), p_description)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'old_balance', COALESCE(v_current_balance, 0),
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create withdrawal request table for tracking pending withdrawals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_refund_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  CONSTRAINT withdrawal_requests_status_check CHECK (
    status = ANY (ARRAY['pending'::TEXT, 'processing'::TEXT, 'completed'::TEXT, 'failed'::TEXT])
  )
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id
  ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at
  ON public.withdrawal_requests(requested_at DESC);

-- RLS for withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own withdrawal requests
CREATE POLICY "withdrawal_requests_select_own" ON public.withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own withdrawal requests
CREATE POLICY "withdrawal_requests_insert_own" ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update withdrawal requests
CREATE POLICY "withdrawal_requests_update_service" ON public.withdrawal_requests
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 8: Add rate limiting tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON public.rate_limits(user_id, action_type, window_start DESC);

-- RLS for rate_limits (service role only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 9: Create helper function to check rate limits
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  SELECT COALESCE(SUM(action_count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start >= v_window_start;

  IF v_count >= p_max_count THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_count', p_max_count,
      'retry_after', p_window_minutes
    );
  END IF;

  -- Increment counter
  INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
  VALUES (p_user_id, p_action_type, 1, NOW())
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET action_count = rate_limits.action_count + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'max_count', p_max_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 10: Grant necessary permissions
-- ============================================================================

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant specific table permissions
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.hash_to_value TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT ON public.home_page_top TO anon, authenticated;
GRANT SELECT ON public.withdrawal_requests TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_user_id_from_hash(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_balance_atomic(UUID, TEXT, NUMERIC, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'hash_to_value', 'transactions', 'home_page_top');

-- Verify policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'hash_to_value', 'transactions')
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE hash_to_value IS 'User balances - SECURED with RLS by user_id';
COMMENT ON TABLE transactions IS 'Transaction history - SECURED with RLS by user_id';
COMMENT ON TABLE webhook_events IS 'Stripe webhook idempotency tracking';
COMMENT ON TABLE withdrawal_requests IS 'User withdrawal requests with Stripe refund tracking';
COMMENT ON TABLE rate_limits IS 'Rate limiting for critical operations';
