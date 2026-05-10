-- ================================================================
-- KINETIX Migration: Events & Outreach Full Feature Update
-- Run ONCE in pgAdmin4 Query Tool on kinetix_db
-- Safe to run — uses IF NOT EXISTS / DO NOTHING throughout
-- ================================================================

-- STEP 1: Add original_status to doctors table
-- Stores the doctor's status before being set to OD
-- so we can restore it after the event ends
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS original_status VARCHAR(50) DEFAULT NULL;

-- STEP 2: Add UNIQUE constraint on event_assignments
-- Prevents the same user being assigned to the same event twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event_assignment
ON event_assignments (event_id, user_id);

-- STEP 3: Verify
-- SELECT * FROM doctors LIMIT 5;
-- SELECT * FROM event_assignments LIMIT 5;
