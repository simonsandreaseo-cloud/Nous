-- Diagnostics: Check Projects and User
SELECT id, name, user_id, gsc_connected FROM projects;

-- Check GSC Tokens
SELECT * FROM user_gsc_tokens;
