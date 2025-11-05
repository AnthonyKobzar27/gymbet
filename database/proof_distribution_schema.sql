-- Create proof_distribution table to track which users should validate which proofs
-- This implements the PBFT (Practical Byzantine Fault Tolerance) system
CREATE TABLE IF NOT EXISTS proof_distribution (
  id SERIAL PRIMARY KEY,
  activity_log_id INTEGER NOT NULL REFERENCES activity_log(id) ON DELETE CASCADE,
  validator_hash TEXT NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one distribution per validator per proof
  UNIQUE(activity_log_id, validator_hash)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proof_distribution_activity_log_id ON proof_distribution(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_proof_distribution_validator_hash ON proof_distribution(validator_hash);
CREATE INDEX IF NOT EXISTS idx_proof_distribution_validator_unvoted ON proof_distribution(validator_hash, has_voted) WHERE has_voted = FALSE;

-- Enable Row Level Security
ALTER TABLE proof_distribution ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read distributions
CREATE POLICY "Anyone can read distributions" ON proof_distribution
  FOR SELECT
  USING (true);

-- Create policy: System can insert distributions
CREATE POLICY "System can insert distributions" ON proof_distribution
  FOR INSERT
  WITH CHECK (true);

-- Create policy: System can update distributions
CREATE POLICY "System can update distributions" ON proof_distribution
  FOR UPDATE
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE proof_distribution IS 'Tracks which users are assigned to validate which proofs using PBFT (2/3 majority)';
COMMENT ON COLUMN proof_distribution.activity_log_id IS 'Foreign key to the activity_log proof submission';
COMMENT ON COLUMN proof_distribution.validator_hash IS 'Hash of the user assigned to validate this proof';
COMMENT ON COLUMN proof_distribution.has_voted IS 'Whether the validator has cast their vote';

-- Add validation status to activity_log
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS total_validators INTEGER DEFAULT 0;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS required_approvals INTEGER DEFAULT 0;

COMMENT ON COLUMN activity_log.validation_status IS 'PBFT validation status: pending, approved (2/3+), or rejected';
COMMENT ON COLUMN activity_log.total_validators IS 'Total number of validators assigned to this proof';
COMMENT ON COLUMN activity_log.required_approvals IS 'Number of approvals needed (2/3 of total_validators)';
