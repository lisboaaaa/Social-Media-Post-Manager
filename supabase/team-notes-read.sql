-- Run this in the SQL Editor to make the Team notes "unread" badge persist
-- per person, instead of resetting every time the browser reloads.

alter table profiles add column if not exists last_read_team_notes_at timestamptz;
