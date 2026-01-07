export interface WeeklySchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface Game {
  id: string;
  split_type: string;
  weekly_schedule?: WeeklySchedule;
  stake: number;
  status: 'joinable' | 'active' | 'completed';
  player_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_hash: string;
  joined_at: string;
  status: 'active' | 'eliminated' | 'winner';
  total_workouts: number;
  last_submission_date: string | null;
}

export interface GameSubmission {
  id: string;
  game_id: string;
  user_hash: string;
  submission_date: string;
  photo_url: string;
  submitted_at: string;
  is_on_time: boolean;
  verified: boolean;
}

export interface GameLog {
  id: string;
  game_id: string;
  user_hash: string | null;
  message: string;
  event_type: 'join' | 'workout' | 'elimination' | 'win' | 'missed_workout' | 'game_start' | 'game_end' | 'chat' | 'proof';
  created_at: string;
  photo_url?: string | null;
}

export interface GameWithPlayers extends Game {
  players: GamePlayer[];
  logs: GameLog[];
}

