-- Add robots_txt column to sites table
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS robots_txt TEXT;
