-- Add legal acceptance tracking to user_profiles
-- Migration: Add terms and privacy acceptance fields

-- Add columns for legal acceptance
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legal_acceptance_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_version TEXT DEFAULT '1.0';

-- Add index for quick lookup of users who haven't accepted
CREATE INDEX IF NOT EXISTS idx_user_profiles_legal_acceptance 
ON user_profiles(terms_accepted, privacy_accepted) 
WHERE terms_accepted = FALSE OR privacy_accepted = FALSE;

-- Comment for documentation
COMMENT ON COLUMN user_profiles.terms_accepted IS 'Whether user has accepted Terms of Service';
COMMENT ON COLUMN user_profiles.privacy_accepted IS 'Whether user has accepted Privacy Policy';
COMMENT ON COLUMN user_profiles.legal_acceptance_date IS 'Date/time when user accepted legal documents';
COMMENT ON COLUMN user_profiles.terms_version IS 'Version of Terms of Service accepted (e.g. 1.0, 1.1)';
COMMENT ON COLUMN user_profiles.privacy_version IS 'Version of Privacy Policy accepted (e.g. 1.0, 1.1)';
