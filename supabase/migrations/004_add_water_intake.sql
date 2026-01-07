-- Add water_intake column to nutrition_logs table
ALTER TABLE public.nutrition_logs 
ADD COLUMN IF NOT EXISTS water_intake INTEGER DEFAULT 0 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.nutrition_logs.water_intake IS 'Total water intake in milliliters (ml) for the day';
