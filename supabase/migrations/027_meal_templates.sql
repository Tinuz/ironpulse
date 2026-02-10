-- Migration: Meal Templates (Presets) System
-- Enable users to create reusable meal templates for quick logging

-- ===== MEAL TEMPLATES TABLE =====
-- Core template definitions (e.g., "Standard Breakfast")
CREATE TABLE IF NOT EXISTS public.meal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    is_auto_generated BOOLEAN DEFAULT FALSE, -- True if suggested by algorithm
    usage_count INTEGER DEFAULT 0, -- Track popularity for sorting
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== MEAL TEMPLATE ITEMS TABLE =====
-- Individual food items within each template (many-to-many)
CREATE TABLE IF NOT EXISTS public.meal_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
    
    -- Food item details (denormalized for flexibility)
    food_name TEXT NOT NULL,
    food_brand TEXT, -- Optional brand
    
    -- Nutritional info per 100g (baseline)
    calories_per_100g NUMERIC(10, 2) NOT NULL,
    protein_per_100g NUMERIC(10, 2) NOT NULL,
    carbs_per_100g NUMERIC(10, 2) NOT NULL,
    fats_per_100g NUMERIC(10, 2) NOT NULL,
    
    -- Quantity in this template
    quantity NUMERIC(10, 2) NOT NULL, -- e.g., 200 (grams)
    unit TEXT NOT NULL DEFAULT 'g', -- 'g', 'ml', 'piece', 'scoop', etc.
    
    -- Optional reference to food database (for future integration)
    food_item_id TEXT, -- Could be barcode or OFF/USDA ID
    
    custom_notes TEXT, -- Per-item notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX idx_meal_templates_user ON public.meal_templates(user_id);
CREATE INDEX idx_meal_templates_user_usage ON public.meal_templates(user_id, usage_count DESC);
CREATE INDEX idx_meal_templates_category ON public.meal_templates(user_id, category);
CREATE INDEX idx_meal_template_items_template ON public.meal_template_items(template_id);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_template_items ENABLE ROW LEVEL SECURITY;

-- Users can only view their own templates
CREATE POLICY "Users can view own meal templates"
ON public.meal_templates FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own meal templates"
ON public.meal_templates FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own meal templates"
ON public.meal_templates FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own meal templates"
ON public.meal_templates FOR DELETE
USING (auth.uid()::text = user_id);

-- Template items: Restrict access to items belonging to user's templates
CREATE POLICY "Users can view own meal template items"
ON public.meal_template_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.meal_templates
        WHERE meal_templates.id = meal_template_items.template_id
        AND meal_templates.user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can insert own meal template items"
ON public.meal_template_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.meal_templates
        WHERE meal_templates.id = meal_template_items.template_id
        AND meal_templates.user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can update own meal template items"
ON public.meal_template_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.meal_templates
        WHERE meal_templates.id = meal_template_items.template_id
        AND meal_templates.user_id = auth.uid()::text
    )
);

CREATE POLICY "Users can delete own meal template items"
ON public.meal_template_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.meal_templates
        WHERE meal_templates.id = meal_template_items.template_id
        AND meal_templates.user_id = auth.uid()::text
    )
);

-- ===== TRIGGERS =====
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_templates_updated_at
    BEFORE UPDATE ON public.meal_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_meal_templates_updated_at();

-- ===== HELPER FUNCTION: Get template with total calories =====
-- Useful for sorting/filtering templates by calorie content
CREATE OR REPLACE FUNCTION get_template_calories(template_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_calories NUMERIC;
BEGIN
    SELECT COALESCE(SUM(
        (calories_per_100g / 100.0) * quantity
    ), 0) INTO total_calories
    FROM public.meal_template_items
    WHERE template_id = template_id_param;
    
    RETURN ROUND(total_calories, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE public.meal_templates IS 'Reusable meal templates (presets) for quick nutrition logging';
COMMENT ON TABLE public.meal_template_items IS 'Individual food items within meal templates';
COMMENT ON COLUMN public.meal_templates.is_auto_generated IS 'True if template was automatically suggested by pattern detection';
COMMENT ON COLUMN public.meal_templates.usage_count IS 'Number of times template has been logged (for popularity sorting)';
COMMENT ON COLUMN public.meal_template_items.calories_per_100g IS 'Calories per 100g (baseline for scaling)';
COMMENT ON COLUMN public.meal_template_items.quantity IS 'Amount in grams/ml (e.g., 200 for 200g)';
COMMENT ON COLUMN public.meal_template_items.food_item_id IS 'Optional reference to external food database (barcode, OFF ID, USDA ID)';
