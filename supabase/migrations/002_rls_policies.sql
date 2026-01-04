-- Enable Row Level Security
ALTER TABLE schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Schemas policies
CREATE POLICY "Users can view their own schemas"
  ON schemas FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own schemas"
  ON schemas FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own schemas"
  ON schemas FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own schemas"
  ON schemas FOR DELETE
  USING (auth.uid()::text = user_id);

-- Workout history policies
CREATE POLICY "Users can view their own workout history"
  ON workout_history FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own workout history"
  ON workout_history FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own workout history"
  ON workout_history FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own workout history"
  ON workout_history FOR DELETE
  USING (auth.uid()::text = user_id);

-- Body stats policies
CREATE POLICY "Users can view their own body stats"
  ON body_stats FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own body stats"
  ON body_stats FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own body stats"
  ON body_stats FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own body stats"
  ON body_stats FOR DELETE
  USING (auth.uid()::text = user_id);

-- Nutrition logs policies
CREATE POLICY "Users can view their own nutrition logs"
  ON nutrition_logs FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own nutrition logs"
  ON nutrition_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own nutrition logs"
  ON nutrition_logs FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own nutrition logs"
  ON nutrition_logs FOR DELETE
  USING (auth.uid()::text = user_id);
