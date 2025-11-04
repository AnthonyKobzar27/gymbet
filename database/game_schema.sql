-- Game System Schema
-- This schema supports 8-player wake-up challenge games with daily photo submissions

-- 1. Games table - tracks all games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wake_up_time TIME NOT NULL,
  stake DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('joinable', 'active', 'completed')),
  player_count INTEGER NOT NULL DEFAULT 0 CHECK (player_count >= 0 AND player_count <= 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Index for finding joinable games
CREATE INDEX IF NOT EXISTS idx_games_status_player_count ON games(status, player_count);

-- 2. Game players table - tracks which users are in which games
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
  total_wakeups INTEGER NOT NULL DEFAULT 0,
  last_submission_date DATE,
  UNIQUE(game_id, user_hash)
);

-- Index for finding players in a game
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
-- Index for finding games by user
CREATE INDEX IF NOT EXISTS idx_game_players_user_hash ON game_players(user_hash);

-- 3. Game submissions table - tracks daily photo proof submissions
CREATE TABLE IF NOT EXISTS game_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  submission_date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_on_time BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(game_id, user_hash, submission_date)
);

-- Index for finding submissions by game and date
CREATE INDEX IF NOT EXISTS idx_game_submissions_game_date ON game_submissions(game_id, submission_date);
-- Index for finding user submissions
CREATE INDEX IF NOT EXISTS idx_game_submissions_user ON game_submissions(user_hash, game_id);

-- 4. Game logs table - tracks all events in a game (activity feed)
CREATE TABLE IF NOT EXISTS game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_hash TEXT,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('join', 'wakeup', 'elimination', 'win', 'missed_wakeup', 'game_start', 'game_end')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching game logs in order
CREATE INDEX IF NOT EXISTS idx_game_logs_game_created ON game_logs(game_id, created_at DESC);

-- Enable Row Level Security (RLS) - customize based on your auth setup
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all users to read, but restrict writes
-- Adjust these based on your authentication requirements

-- Games: Everyone can read, anyone can create joinable games
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update games" ON games FOR UPDATE USING (true);

-- Game players: Everyone can read, players can join
CREATE POLICY "Anyone can view game players" ON game_players FOR SELECT USING (true);
CREATE POLICY "Anyone can join games" ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update game players" ON game_players FOR UPDATE USING (true);

-- Game submissions: Everyone can read their own and game submissions
CREATE POLICY "Anyone can view game submissions" ON game_submissions FOR SELECT USING (true);
CREATE POLICY "Users can submit proofs" ON game_submissions FOR INSERT WITH CHECK (true);

-- Game logs: Everyone can read
CREATE POLICY "Anyone can view game logs" ON game_logs FOR SELECT USING (true);
CREATE POLICY "System can create logs" ON game_logs FOR INSERT WITH CHECK (true);
