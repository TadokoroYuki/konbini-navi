-- User profiles for personalized nutrition targets
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  gender VARCHAR(10),
  age INTEGER,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  activity_level VARCHAR(20) DEFAULT 'moderate',
  target_calories NUMERIC(10,2),
  target_protein NUMERIC(10,2),
  target_fat NUMERIC(10,2),
  target_carbs NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
