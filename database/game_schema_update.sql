-- Migration to add photo_url and chat/proof event types to game_logs

-- Add photo_url column to game_logs
ALTER TABLE game_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update event_type constraint to include 'chat' and 'proof'
ALTER TABLE game_logs DROP CONSTRAINT IF EXISTS game_logs_event_type_check;
ALTER TABLE game_logs ADD CONSTRAINT game_logs_event_type_check
  CHECK (event_type IN ('join', 'wakeup', 'elimination', 'win', 'missed_wakeup', 'game_start', 'game_end', 'chat', 'proof'));
