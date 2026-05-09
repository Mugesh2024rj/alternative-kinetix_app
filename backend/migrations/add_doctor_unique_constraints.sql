-- ================================================================
-- KINETIX Migration: Enterprise Duplicate Prevention for Doctors
-- Run this ONCE in pgAdmin4 Query Tool on kinetix_db
-- Safe to run multiple times — uses IF NOT EXISTS / DO NOTHING
-- ================================================================

-- STEP 1: Add doctor_code column if it does not exist yet
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS doctor_code VARCHAR(50);

-- STEP 2: Clean up any existing duplicates before adding constraints
-- (keeps the oldest record — lowest id — per duplicate field)

-- Remove duplicate emails (keep oldest)
DELETE FROM doctors
WHERE email IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM doctors WHERE email IS NOT NULL GROUP BY email
  );

-- Remove duplicate phones (keep oldest)
DELETE FROM doctors
WHERE phone IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM doctors WHERE phone IS NOT NULL GROUP BY phone
  );

-- Remove duplicate doctor_codes (keep oldest)
DELETE FROM doctors
WHERE doctor_code IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM doctors WHERE doctor_code IS NOT NULL GROUP BY doctor_code
  );

-- STEP 3: Add partial UNIQUE indexes
-- Partial indexes allow multiple NULL values (safe for optional fields)

-- Unique email (ignores NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_email
  ON doctors (email)
  WHERE email IS NOT NULL;

-- Unique phone (ignores NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_phone
  ON doctors (phone)
  WHERE phone IS NOT NULL;

-- Unique doctor_code (ignores NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_doctor_code
  ON doctors (doctor_code)
  WHERE doctor_code IS NOT NULL;

-- STEP 4: Verify — all three should return 0 rows if clean
-- SELECT email, COUNT(*) FROM doctors GROUP BY email HAVING COUNT(*) > 1;
-- SELECT phone, COUNT(*) FROM doctors GROUP BY phone HAVING COUNT(*) > 1;
-- SELECT doctor_code, COUNT(*) FROM doctors GROUP BY doctor_code HAVING COUNT(*) > 1;
