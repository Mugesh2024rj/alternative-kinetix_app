-- Migration: Add original_status field to doctors table
-- Purpose: Track doctor's original status before OD (Outside Duty) assignment
-- This field is used to restore the doctor's status when an event is cancelled

ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS original_status VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN doctors.original_status IS 'Stores the doctor''s original status before being marked for OD. Used to restore status when event is cancelled or completed.';
