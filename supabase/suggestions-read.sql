-- Run this in the SQL Editor to make the "Suggestions" tab's new-idea dot
-- clear once someone actually opens the inbox, instead of it staying lit
-- until the suggestion is turned into a post or dismissed.

alter table profiles add column if not exists last_read_suggestions_at timestamptz;
