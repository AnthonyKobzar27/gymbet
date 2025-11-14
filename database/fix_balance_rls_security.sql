-- ============================================================================
-- FIX: Balance Audit Log RLS Policy
-- ============================================================================
-- This fixes the "new row violates RLS policy" error when leaving games
-- The balance_audit_log table needs to allow inserts from authenticated users
-- when they're updating their own balance through game operations
-- ============================================================================

-- STEP 1: Add user_id column to balance_audit_log for consistency
ALTER TABLE public.balance_audit_log
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_balance_audit_log_user_id ON public.balance_audit_log(user_id);

-- STEP 2: Populate user_id from existing user_hash data
UPDATE public.balance_audit_log bal
SET user_id = p.user_id
FROM public.profiles p
WHERE bal.user_hash = p.hash
  AND bal.user_id IS NULL;

-- STEP 3: Drop ALL existing policies (including ones we just created)
DROP POLICY IF EXISTS "Allow users to view their own audit logs" ON public.balance_audit_log;
DROP POLICY IF EXISTS "Allow system to insert audit logs" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_select_service" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_insert_service" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_service_only" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_service_all" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_insert_own" ON public.balance_audit_log;
DROP POLICY IF EXISTS "audit_log_select_own" ON public.balance_audit_log;

-- STEP 4: Create new secure policies
-- Allow service role full access (for webhooks, admin operations)
CREATE POLICY "audit_log_service_all" ON public.balance_audit_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own audit logs
-- This is safe because:
-- 1. Users can only insert records with their own user_id
-- 2. The actual balance updates are still protected by hash_to_value RLS
-- 3. Audit logs are append-only (no update/delete)
CREATE POLICY "audit_log_insert_own" ON public.balance_audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.role() = 'service_role'
  );

-- Allow users to view their own audit logs
CREATE POLICY "audit_log_select_own" ON public.balance_audit_log
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.role() = 'service_role'
  );

-- STEP 5: Grant necessary permissions
GRANT SELECT, INSERT ON public.balance_audit_log TO authenticated;

-- STEP 6: Fix the audit trigger function to include user_id
CREATE OR REPLACE FUNCTION audit_balance_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO balance_audit_log (user_id, user_hash, old_value, new_value, operation)
    VALUES (NEW.user_id, NEW.hash, OLD.value, NEW.value, 'UPDATE');
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO balance_audit_log (user_id, user_hash, old_value, new_value, operation)
    VALUES (NEW.user_id, NEW.hash, 0, NEW.value, 'INSERT');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS balance_change_audit ON hash_to_value;
CREATE TRIGGER balance_change_audit
  AFTER INSERT OR UPDATE ON hash_to_value
  FOR EACH ROW
  EXECUTE FUNCTION audit_balance_change();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that policies are created correctly
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'balance_audit_log'
ORDER BY policyname;

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'balance_audit_log';

-- Check that user_id column exists and is populated
SELECT
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_missing_user_id
FROM balance_audit_log;
