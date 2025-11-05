-- Add column to track last sleep log date
ALTER TABLE home_page_top ADD COLUMN IF NOT EXISTS last_sleep_log_date DATE;

COMMENT ON COLUMN home_page_top.last_sleep_log_date IS 'Date of the last sleep log entry (to enforce once per day limit)';
