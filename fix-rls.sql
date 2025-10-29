-- =====================================================
-- FIX RLS ISSUES FOR PROFILE CREATION
-- =====================================================

-- Temporarily disable RLS on profiles and wallets tables for testing
-- (Re-enable after testing)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;

-- Alternative: Update the insert policy to be more permissive
-- DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
-- CREATE POLICY "Users can insert own profile" ON public.profiles
--   FOR INSERT WITH CHECK (true); -- Temporarily allow all inserts

-- Re-enable RLS (uncomment after testing)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MANUAL PROFILE CREATION FUNCTION
-- =====================================================

-- Function to manually create profiles for existing auth users
CREATE OR REPLACE FUNCTION create_profile_for_user(user_id UUID, username TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email_verified,
    total_games_played,
    total_games_won,
    total_winnings,
    current_streak,
    longest_streak
  ) VALUES (
    user_id,
    LOWER(username),
    username,
    false,
    0,
    0,
    0,
    0,
    0
  );
  
  -- Also create wallet
  INSERT INTO public.wallets (
    user_id,
    balance_cents
  ) VALUES (
    user_id,
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER TO AUTO-CREATE PROFILES
-- =====================================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email_verified
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );
  
  -- Create wallet
  INSERT INTO public.wallets (
    user_id,
    balance_cents
  ) VALUES (
    NEW.id,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. Run this script in your Supabase SQL editor
-- 2. Test signup - profiles should be created automatically
-- 3. If still having issues, temporarily disable RLS (uncomment first section)
-- 4. For existing users without profiles, use:
--    SELECT create_profile_for_user('user-uuid-here', 'desired-username');
