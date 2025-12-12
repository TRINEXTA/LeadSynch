-- Migration: Add user colors and planning improvements
-- Date: 2025-12-12

-- Add color column to users table for planning visualization
ALTER TABLE users ADD COLUMN IF NOT EXISTS planning_color VARCHAR(7);

-- Update event_type enum in planning_events to include new categories
-- First, let's add the new categories as valid options
-- The categories are: meeting, call, video, task, break, other, absence, sick_leave, vacation, late, full_day, half_day, follow_up

-- Update planning_events to support linking to follow_ups
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS follow_up_id UUID REFERENCES follow_ups(id) ON DELETE SET NULL;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE;

-- Add reminder notifications columns
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS reminder_30min_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE planning_events ADD COLUMN IF NOT EXISTS reminder_ontime_sent BOOLEAN DEFAULT FALSE;

-- Note: Run this query after migration to assign colors to users manually if needed:
-- UPDATE users SET planning_color = (ARRAY['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16','#F97316','#14B8A6','#6366F1','#78716C'])[1 + (FLOOR(RANDOM() * 12)::int)] WHERE planning_color IS NULL;

-- Create index for faster follow-up queries on planning
CREATE INDEX IF NOT EXISTS idx_planning_follow_up ON planning_events(follow_up_id) WHERE follow_up_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_planning_user_date ON planning_events(user_id, start_date);
