-- Create game_subscriptions table to track which games are being followed
CREATE TABLE IF NOT EXISTS game_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'basketball/nba',
  last_score_home TEXT,
  last_score_away TEXT,
  last_period INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(experience_id, game_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_subscriptions_experience ON game_subscriptions(experience_id);
CREATE INDEX IF NOT EXISTS idx_game_subscriptions_active ON game_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_game_subscriptions_game_id ON game_subscriptions(game_id);
