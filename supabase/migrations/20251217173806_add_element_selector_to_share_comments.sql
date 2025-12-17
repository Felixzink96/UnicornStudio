-- Add element-based positioning columns to share_comments
ALTER TABLE share_comments
ADD COLUMN IF NOT EXISTS element_selector TEXT,
ADD COLUMN IF NOT EXISTS offset_x REAL,
ADD COLUMN IF NOT EXISTS offset_y REAL;

-- Add comment to explain the columns
COMMENT ON COLUMN share_comments.element_selector IS 'CSS selector for the element this comment is attached to';
COMMENT ON COLUMN share_comments.offset_x IS 'X offset in pixels from the element''s top-left corner';
COMMENT ON COLUMN share_comments.offset_y IS 'Y offset in pixels from the element''s top-left corner';
