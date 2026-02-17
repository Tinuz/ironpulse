-- Migration 030: Add saturated and unsaturated fat tracking to custom_food_items
-- 
-- This migration adds optional columns for saturated and unsaturated fat tracking
-- to enable better nutrition analysis and fat quality metrics.
-- 
-- Nutritional context:
-- - Saturated fat: Should be limited to ~10% of total calories
-- - Unsaturated fat: Healthier fat source, should make up majority of fat intake
-- - Ratio tracking enables quality scores and health recommendations

-- Add saturated_fat and unsaturated_fat columns to custom_food_items table
ALTER TABLE public.custom_food_items
ADD COLUMN IF NOT EXISTS saturated_fat NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS unsaturated_fat NUMERIC(8,2);

-- Add comments for documentation
COMMENT ON COLUMN public.custom_food_items.saturated_fat IS 'Saturated fat content in grams per serving';
COMMENT ON COLUMN public.custom_food_items.unsaturated_fat IS 'Unsaturated fat (mono + poly) content in grams per serving';

-- Note: nutrition_logs.items is JSONB, so no schema change needed
-- The saturatedFat and unsaturatedFat fields will be added to individual items in the JSONB array
