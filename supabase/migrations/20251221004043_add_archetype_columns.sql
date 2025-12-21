-- Add archetype and related columns to design_variables
-- These columns store the design archetype system settings

-- Archetype column (architect, innovator, brutalist, organic)
ALTER TABLE design_variables
ADD COLUMN IF NOT EXISTS archetype text DEFAULT 'innovator';

-- Motion settings (animation preferences)
ALTER TABLE design_variables
ADD COLUMN IF NOT EXISTS motion jsonb DEFAULT '{
  "style": "snappy",
  "duration": {"fast": "150ms", "normal": "300ms", "slow": "500ms"},
  "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
  "hoverScale": 1.05,
  "revealDistance": "40px"
}'::jsonb;

-- Layout settings
ALTER TABLE design_variables
ADD COLUMN IF NOT EXISTS layout jsonb DEFAULT '{
  "style": "symmetric",
  "maxWidth": "1440px",
  "sectionSpacing": "5rem",
  "useOverlaps": true,
  "heroStyle": "centered"
}'::jsonb;

-- Visual effects settings
ALTER TABLE design_variables
ADD COLUMN IF NOT EXISTS effects jsonb DEFAULT '{
  "useNoise": true,
  "useBlur": true,
  "useGradientBlobs": true,
  "useScanLines": false,
  "borderStyle": "none"
}'::jsonb;

-- Add comment
COMMENT ON COLUMN design_variables.archetype IS 'Design archetype: architect, innovator, brutalist, or organic';
COMMENT ON COLUMN design_variables.motion IS 'Animation and motion preferences based on archetype';
COMMENT ON COLUMN design_variables.layout IS 'Layout preferences based on archetype';
COMMENT ON COLUMN design_variables.effects IS 'Visual effects preferences based on archetype';
