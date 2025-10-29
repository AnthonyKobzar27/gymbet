-- =====================================================
-- SUPABASE DATABASE SCHEMA FOR DISCIPLINE BETTING APP
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USER PROFILES & AUTHENTICATION
-- =====================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Privacy settings
  is_public BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  
  -- Stats
  total_games_played INTEGER DEFAULT 0,
  total_games_won INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0.00,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Verification
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false
);

-- =====================================================
-- 2. WALLET & FINANCIAL SYSTEM
-- =====================================================

-- User wallets (encrypted sensitive data)
CREATE TABLE public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Balance (stored in cents for precision)
  balance_cents INTEGER DEFAULT 0 CHECK (balance_cents >= 0),
  
  -- Encrypted fields for sensitive data
  encrypted_stripe_customer_id TEXT, -- Encrypted Stripe customer ID
  encrypted_payment_methods JSONB, -- Encrypted payment method details
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Transaction history
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'stake', 'win', 'loss', 'refund')),
  amount_cents INTEGER NOT NULL, -- Positive for credits, negative for debits
  description TEXT NOT NULL,
  
  -- External references
  stripe_payment_intent_id TEXT, -- For deposits/withdrawals
  game_id UUID, -- For game-related transactions
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. GAME SYSTEM
-- =====================================================

-- Game templates/categories
CREATE TABLE public.game_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('wake_up', 'exercise', 'study', 'habit', 'custom')),
  
  -- Default settings
  default_duration_hours INTEGER DEFAULT 24,
  default_min_stake_cents INTEGER DEFAULT 500, -- $5 minimum
  default_max_stake_cents INTEGER DEFAULT 10000, -- $100 maximum
  
  -- Verification requirements
  requires_photo BOOLEAN DEFAULT false,
  requires_location BOOLEAN DEFAULT false,
  requires_time_window BOOLEAN DEFAULT true,
  
  -- Metadata
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual games/challenges
CREATE TABLE public.games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES public.game_templates(id),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Game details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  verification_deadline TIMESTAMP WITH TIME ZONE, -- When proof must be submitted
  
  -- Stakes
  stake_amount_cents INTEGER NOT NULL CHECK (stake_amount_cents > 0),
  total_pot_cents INTEGER DEFAULT 0,
  
  -- Settings
  max_participants INTEGER DEFAULT 100,
  requires_photo BOOLEAN DEFAULT false,
  requires_location BOOLEAN DEFAULT false,
  target_location POINT, -- PostGIS point for location-based challenges
  location_radius_meters INTEGER DEFAULT 100,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'active', 'verification', 'completed', 'cancelled')),
  
  -- Results
  winner_count INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game participants
CREATE TABLE public.game_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Participation details
  stake_amount_cents INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Verification
  submitted_proof BOOLEAN DEFAULT false,
  proof_photo_url TEXT,
  proof_location POINT,
  proof_timestamp TIMESTAMP WITH TIME ZONE,
  proof_notes TEXT,
  
  -- Results
  is_winner BOOLEAN DEFAULT false,
  winnings_cents INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disqualified', 'refunded')),
  
  UNIQUE(game_id, user_id)
);

-- =====================================================
-- 4. SOCIAL FEATURES
-- =====================================================

-- Friend relationships
CREATE TABLE public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Activity feed
CREATE TABLE public.activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity details
  type TEXT NOT NULL CHECK (type IN ('game_created', 'game_joined', 'game_won', 'game_lost', 'friend_added', 'achievement_unlocked')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- References
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. NOTIFICATIONS
-- =====================================================

CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('game_reminder', 'game_result', 'friend_request', 'payment_received', 'verification_required')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- References
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_pushed BOOLEAN DEFAULT false, -- Whether push notification was sent
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ACHIEVEMENTS & GAMIFICATION
-- =====================================================

CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  
  -- Requirements
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('games_won', 'streak', 'total_winnings', 'games_created')),
  requirement_value INTEGER NOT NULL,
  
  -- Rewards
  reward_type TEXT CHECK (reward_type IN ('badge', 'bonus_credits')),
  reward_value INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- User profiles
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- Wallets
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- Transactions
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transactions_game_id ON public.transactions(game_id);

-- Games
CREATE INDEX idx_games_creator_id ON public.games(creator_id);
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_start_time ON public.games(start_time);
CREATE INDEX idx_games_category ON public.games(category);

-- Game participants
CREATE INDEX idx_game_participants_game_id ON public.game_participants(game_id);
CREATE INDEX idx_game_participants_user_id ON public.game_participants(user_id);

-- Activities
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at);
CREATE INDEX idx_activities_type ON public.activities(type);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view public profiles" ON public.profiles
  FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can only access own wallet" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can only view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Games policies
CREATE POLICY "Anyone can view active games" ON public.games
  FOR SELECT USING (status IN ('open', 'active', 'verification', 'completed'));

CREATE POLICY "Users can create games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own games" ON public.games
  FOR UPDATE USING (auth.uid() = creator_id);

-- Game participants policies
CREATE POLICY "Users can view game participants" ON public.game_participants
  FOR SELECT USING (true); -- Public for leaderboards

CREATE POLICY "Users can join games" ON public.game_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON public.game_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view public activities" ON public.activities
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can only access own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create wallet when profile is created
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_wallet_on_profile_creation
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_wallet();

-- Function to update wallet balance on transaction
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.wallets
  SET balance_cents = balance_cents + NEW.amount_cents,
      updated_at = NOW()
  WHERE id = NEW.wallet_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- =====================================================
-- 10. INITIAL DATA
-- =====================================================

-- Insert default game templates
INSERT INTO public.game_templates (name, description, category, requires_photo, requires_time_window) VALUES
('Early Bird Challenge', 'Wake up before 6 AM and prove it!', 'wake_up', true, true),
('Morning Workout', 'Complete a 30-minute workout before 8 AM', 'exercise', true, true),
('Study Session', 'Study for at least 2 hours', 'study', false, false),
('No Social Media', 'Avoid social media for 24 hours', 'habit', false, false),
('Meditation Practice', 'Meditate for at least 20 minutes', 'habit', false, false);

-- Insert default achievements
INSERT INTO public.achievements (name, description, requirement_type, requirement_value, reward_type, reward_value) VALUES
('First Win', 'Win your first challenge', 'games_won', 1, 'badge', 0),
('Streak Master', 'Win 5 challenges in a row', 'streak', 5, 'bonus_credits', 500),
('High Roller', 'Earn $100 in total winnings', 'total_winnings', 10000, 'badge', 0),
('Game Creator', 'Create your first challenge', 'games_created', 1, 'badge', 0),
('Champion', 'Win 10 challenges', 'games_won', 10, 'bonus_credits', 1000);
