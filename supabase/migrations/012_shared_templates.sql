-- Migration: Shared Templates for Workout Schemas
-- Enable users to share their workout templates via shareable links

-- Create shared_templates table
CREATE TABLE IF NOT EXISTS public.shared_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    schema_id UUID NOT NULL REFERENCES public.schemas(id) ON DELETE CASCADE,
    share_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    color TEXT,
    created_by_username TEXT,
    created_by_avatar TEXT,
    view_count INTEGER DEFAULT 0,
    import_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shared_templates_share_code ON public.shared_templates(share_code);
CREATE INDEX idx_shared_templates_user ON public.shared_templates(user_id);
CREATE INDEX idx_shared_templates_schema ON public.shared_templates(schema_id);
CREATE INDEX idx_shared_templates_created ON public.shared_templates(created_at DESC);
CREATE INDEX idx_shared_templates_active ON public.shared_templates(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.shared_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active shared templates (public links)
CREATE POLICY "Anyone can view active shared templates"
ON public.shared_templates FOR SELECT
USING (is_active = true);

-- Users can view their own shared templates (even if inactive)
CREATE POLICY "Users can view own shared templates"
ON public.shared_templates FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can create shared templates for their own schemas
CREATE POLICY "Users can create shared templates"
ON public.shared_templates FOR INSERT
WITH CHECK (
    auth.uid()::text = user_id 
    AND EXISTS (
        SELECT 1 FROM schemas 
        WHERE schemas.id = shared_templates.schema_id 
        AND schemas.user_id = auth.uid()::text
    )
);

-- Users can update their own shared templates
CREATE POLICY "Users can update own shared templates"
ON public.shared_templates FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can delete their own shared templates
CREATE POLICY "Users can delete own shared templates"
ON public.shared_templates FOR DELETE
USING (auth.uid()::text = user_id);

-- Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar characters (0,O,1,I)
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_template_view(share_code_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE shared_templates
    SET view_count = view_count + 1
    WHERE share_code = share_code_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment import count
CREATE OR REPLACE FUNCTION increment_template_import(share_code_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE shared_templates
    SET import_count = import_count + 1
    WHERE share_code = share_code_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE public.shared_templates IS 'Shareable workout template links with view/import tracking';
