-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas table
CREATE TABLE IF NOT EXISTS public.schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workout_history table
CREATE TABLE IF NOT EXISTS public.workout_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    schema_id UUID REFERENCES public.schemas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create body_stats table
CREATE TABLE IF NOT EXISTS public.body_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    age INTEGER,
    chest DECIMAL(5,2),
    biceps DECIMAL(5,2),
    waist DECIMAL(5,2),
    thighs DECIMAL(5,2),
    shoulders DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create nutrition_logs table
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schemas_user_id ON public.schemas(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON public.workout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_date ON public.workout_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_stats_user_id ON public.body_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_body_stats_date ON public.body_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id ON public.nutrition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON public.nutrition_logs(date DESC);

-- Enable Row Level Security
ALTER TABLE public.schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can add auth later)
CREATE POLICY "Allow all operations on schemas" ON public.schemas FOR ALL USING (true);
CREATE POLICY "Allow all operations on workout_history" ON public.workout_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on body_stats" ON public.body_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations on nutrition_logs" ON public.nutrition_logs FOR ALL USING (true);
