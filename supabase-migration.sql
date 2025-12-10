-- Run this in your Supabase SQL Editor to enable cloud sync

-- Create book_progress table for syncing reading progress
CREATE TABLE IF NOT EXISTS book_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  progress REAL DEFAULT 0,
  last_location TEXT DEFAULT '',
  is_favorite BOOLEAN DEFAULT false,
  reading_list TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE book_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own book progress" ON book_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own book progress" ON book_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own book progress" ON book_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own book progress" ON book_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_book_progress_user_id ON book_progress(user_id);
