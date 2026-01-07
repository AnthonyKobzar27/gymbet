export interface ActivityLog {
  id: number;
  user_hash: string;
  sender_hash: string;
  message: string;
  typeofmessage: string;
  image: string | null;
  timestep: string;
  game_id?: string | null;
  validation_status?: 'pending' | 'approved' | 'rejected';
  total_validators?: number;
  required_approvals?: number;
}

export interface Challenge {
  id: number;
  activity_log_id: number;
  user_hash: string;
  proof_status: 'approved' | 'rejected';
  proof_message: string | null;
  proof_image: string | null;
  created_at: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes: string | null;
  resolved_at: string | null;
}

