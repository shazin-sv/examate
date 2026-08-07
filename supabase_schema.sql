-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Schedule entries (topics assigned to dates)
CREATE TABLE IF NOT EXISTS schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_key TEXT NOT NULL,           -- "2026-08-05"
  subject TEXT NOT NULL,            -- "PHYSICS"
  chapter_name TEXT NOT NULL,       -- "Current Electricity"
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedule_date ON schedule(date_key);

-- Daily themes
CREATE TABLE IF NOT EXISTS themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_key TEXT UNIQUE NOT NULL,
  theme_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revision state (1-4-7 checkboxes)
CREATE TABLE IF NOT EXISTS revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,         -- "2026-08-05_0"
  rev1 BOOLEAN DEFAULT false,
  rev4 BOOLEAN DEFAULT false,
  rev7 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom chapters (user-added)
CREATE TABLE IF NOT EXISTS custom_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject, chapter_name)
);

-- Enable Row Level Security (optional, for multi-user)
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_chapters ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (single user)
CREATE POLICY "Public read" ON schedule FOR SELECT USING (true);
CREATE POLICY "Public insert" ON schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON schedule FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON schedule FOR DELETE USING (true);

CREATE POLICY "Public read" ON themes FOR SELECT USING (true);
CREATE POLICY "Public insert" ON themes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON themes FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON themes FOR DELETE USING (true);

CREATE POLICY "Public read" ON revisions FOR SELECT USING (true);
CREATE POLICY "Public insert" ON revisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON revisions FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON revisions FOR DELETE USING (true);

CREATE POLICY "Public read" ON custom_chapters FOR SELECT USING (true);
CREATE POLICY "Public insert" ON custom_chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON custom_chapters FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON custom_chapters FOR DELETE USING (true);
