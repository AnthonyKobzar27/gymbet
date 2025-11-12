-- Migration: Add game_id to activity_log for stake slashing on PBFT rejection
-- This allows us to link rejected proofs to their games for automated stake distribution

-- Add game_id column to track which game a proof belongs to
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE SET NULL;

-- Create index for efficient lookups by game_id
CREATE INDEX IF NOT EXISTS idx_activity_log_game_id ON activity_log(game_id);

-- Add comment for documentation
COMMENT ON COLUMN activity_log.game_id IS 'Foreign key to games table - used for stake slashing when PBFT rejects a proof';
