-- ============================================================================
-- DATA MIGRATION: Populate user_id for existing records
-- Run this AFTER security_fix_migration.sql
-- ============================================================================

-- This script links existing hash-based records to Supabase auth users
-- It must be run with service_role privileges

-- ============================================================================
-- STEP 1: Update profiles table to link email to auth.users
-- ============================================================================

-- Update profiles with user_id from auth.users based on email
UPDATE public.profiles p
SET user_id = u.id
FROM auth.users u
WHERE p.email = u.email
  AND p.user_id IS NULL;

-- ============================================================================
-- STEP 2: Update hash_to_value table using profiles as bridge
-- ============================================================================

-- Update hash_to_value with user_id from profiles based on hash
UPDATE public.hash_to_value htv
SET user_id = p.user_id
FROM public.profiles p
WHERE htv.hash = p.hash
  AND htv.user_id IS NULL
  AND p.user_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Update transactions table using profiles as bridge
-- ============================================================================

-- Update transactions with user_id from profiles based on user_hash
UPDATE public.transactions t
SET user_id = p.user_id
FROM public.profiles p
WHERE t.user_hash = p.hash
  AND t.user_id IS NULL
  AND p.user_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Update home_page_top table using profiles as bridge
-- ============================================================================

-- Update home_page_top with user_id from profiles based on user_hash
UPDATE public.home_page_top hpt
SET user_id = p.user_id
FROM public.profiles p
WHERE hpt.user_hash = p.hash
  AND hpt.user_id IS NULL
  AND p.user_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Verify migration success
-- ============================================================================

-- Check for records missing user_id (these need manual attention)
SELECT 'profiles' AS table_name, COUNT(*) AS missing_user_id
FROM public.profiles
WHERE user_id IS NULL

UNION ALL

SELECT 'hash_to_value', COUNT(*)
FROM public.hash_to_value
WHERE user_id IS NULL

UNION ALL

SELECT 'transactions', COUNT(*)
FROM public.transactions
WHERE user_id IS NULL

UNION ALL

SELECT 'home_page_top', COUNT(*)
FROM public.home_page_top
WHERE user_id IS NULL;

-- ============================================================================
-- STEP 6: Create trigger to auto-populate user_id on new inserts
-- ============================================================================

-- Function to auto-populate user_id from auth context
CREATE OR REPLACE FUNCTION set_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS profiles_set_user_id ON public.profiles;
CREATE TRIGGER profiles_set_user_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_auth();

-- Attach trigger to hash_to_value
DROP TRIGGER IF EXISTS hash_to_value_set_user_id ON public.hash_to_value;
CREATE TRIGGER hash_to_value_set_user_id
  BEFORE INSERT ON public.hash_to_value
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_auth();

-- Attach trigger to transactions
DROP TRIGGER IF EXISTS transactions_set_user_id ON public.transactions;
CREATE TRIGGER transactions_set_user_id
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_auth();

-- Attach trigger to home_page_top
DROP TRIGGER IF EXISTS home_page_top_set_user_id ON public.home_page_top;
CREATE TRIGGER home_page_top_set_user_id
  BEFORE INSERT ON public.home_page_top
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_from_auth();

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

COMMENT ON FUNCTION set_user_id_from_auth() IS 'Auto-populates user_id from auth.uid() on INSERT';

-- ============================================================================
-- DATA MIGRATION COMPLETE
-- ============================================================================
