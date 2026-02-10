-- Migration: Custom Food Items
-- Enable users to create and save custom food items with manual nutritional values

-- ===== CUSTOM FOOD ITEMS TABLE =====
-- User-defined food items (e.g., "Kip Siam", "Oma's Appeltaart")
CREATE TABLE IF NOT EXISTS public.custom_food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    brand TEXT, -- Optional brand/restaurant
    
    -- Nutritional values (per serving as entered by user)
    calories NUMERIC(10, 2) NOT NULL,
    protein NUMERIC(10, 2) NOT NULL,
    carbs NUMERIC(10, 2) NOT NULL,
    fats NUMERIC(10, 2) NOT NULL,
    
    -- Serving info
    serving_size NUMERIC(10, 2) NOT NULL DEFAULT 100, -- e.g., 300g for a full meal
    serving_unit TEXT NOT NULL DEFAULT 'g', -- 'g', 'ml', 'piece', 'portion', etc.
    
    -- Additional info
    category TEXT, -- 'meal', 'snack', 'drink', 'dessert', etc.
    notes TEXT, -- User notes
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0, -- Track popularity
    last_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX idx_custom_food_items_user ON public.custom_food_items(user_id);
CREATE INDEX idx_custom_food_items_user_usage ON public.custom_food_items(user_id, usage_count DESC);
CREATE INDEX idx_custom_food_items_user_last_used ON public.custom_food_items(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX idx_custom_food_items_search ON public.custom_food_items(user_id, name);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.custom_food_items ENABLE ROW LEVEL SECURITY;

-- Users can only view their own custom items
CREATE POLICY "Users can view own custom food items"
ON public.custom_food_items FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own custom food items"
ON public.custom_food_items FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own custom food items"
ON public.custom_food_items FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own custom food items"
ON public.custom_food_items FOR DELETE
USING (auth.uid()::text = user_id);

-- ===== TRIGGERS =====
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_food_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_food_items_updated_at
    BEFORE UPDATE ON public.custom_food_items
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_food_items_updated_at();

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE public.custom_food_items IS 'User-defined food items with manual nutritional values';
COMMENT ON COLUMN public.custom_food_items.serving_size IS 'Serving size as entered by user (e.g., 300 for 300g full meal)';
COMMENT ON COLUMN public.custom_food_items.calories IS 'Total calories for the serving size (not per 100g)';
COMMENT ON COLUMN public.custom_food_items.usage_count IS 'Number of times item has been logged (for popularity sorting)';
