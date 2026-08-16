ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS video_url      text,
  ADD COLUMN IF NOT EXISTS video_style    text DEFAULT 'centered',
  ADD COLUMN IF NOT EXISTS video_position text DEFAULT 'top',
  ADD COLUMN IF NOT EXISTS video_title    text;
