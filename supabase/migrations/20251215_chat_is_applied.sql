-- Migration: Add is_applied column to chat_messages
-- Tracks whether an AI response has been applied to the page

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_applied boolean DEFAULT false;

-- Index for quick filtering of applied messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_applied
ON chat_messages(page_id, is_applied);
