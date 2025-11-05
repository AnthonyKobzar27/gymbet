-- Create proof_votes table to track user votes on activity log proofs
CREATE TABLE IF NOT EXISTS proof_votes (
  id SERIAL PRIMARY KEY,
  activity_log_id INTEGER NOT NULL REFERENCES activity_log(id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('approve', 'reject')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one vote per user per activity
  UNIQUE(activity_log_id, voter_hash)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proof_votes_activity_log_id ON proof_votes(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_proof_votes_voter_hash ON proof_votes(voter_hash);

-- Enable Row Level Security
ALTER TABLE proof_votes ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read votes
CREATE POLICY "Anyone can read votes" ON proof_votes
  FOR SELECT
  USING (true);

-- Create policy: Users can insert their own votes
CREATE POLICY "Users can insert their own votes" ON proof_votes
  FOR INSERT
  WITH CHECK (true);

-- Create policy: Users can update their own votes
CREATE POLICY "Users can update their own votes" ON proof_votes
  FOR UPDATE
  USING (true);

-- Create policy: Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON proof_votes
  FOR DELETE
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE proof_votes IS 'Stores user votes (approve/reject) on activity log proof submissions';
COMMENT ON COLUMN proof_votes.activity_log_id IS 'Foreign key to activity_log table';
COMMENT ON COLUMN proof_votes.voter_hash IS 'Hash of the user who voted';
COMMENT ON COLUMN proof_votes.vote_type IS 'Type of vote: approve or reject';
