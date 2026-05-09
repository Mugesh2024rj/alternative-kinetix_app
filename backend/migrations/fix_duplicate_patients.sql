-- ================================================================
-- KINETIX Migration: Patient Duplicate Prevention + patient_code
-- Run this ONCE in pgAdmin4 Query Tool on kinetix_db
-- Safe to run — uses IF NOT EXISTS / DO NOTHING throughout
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Add patient_code column if it does not exist yet
-- ----------------------------------------------------------------
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS patient_code VARCHAR(30);

-- ----------------------------------------------------------------
-- STEP 2: Detect duplicates before deleting
-- (Uncomment to preview — run this SELECT first to inspect)
-- ----------------------------------------------------------------
-- SELECT full_name, age, gender, condition, COUNT(*) as count,
--        array_agg(id ORDER BY id) as ids
-- FROM patients
-- GROUP BY full_name, age, gender, condition
-- HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------
-- STEP 3: Re-assign foreign keys from duplicate patients
-- to the oldest record (lowest id) before deleting duplicates
-- ----------------------------------------------------------------

-- Fix appointments.patient_id
UPDATE appointments
SET patient_id = (
  SELECT MIN(id) FROM patients p2
  WHERE p2.full_name = (SELECT full_name FROM patients p3 WHERE p3.id = appointments.patient_id)
    AND p2.age       = (SELECT age       FROM patients p3 WHERE p3.id = appointments.patient_id)
    AND p2.gender    = (SELECT gender    FROM patients p3 WHERE p3.id = appointments.patient_id)
)
WHERE patient_id IN (
  SELECT id FROM patients
  WHERE (full_name, age, gender) IN (
    SELECT full_name, age, gender FROM patients
    GROUP BY full_name, age, gender HAVING COUNT(*) > 1
  )
  AND id NOT IN (
    SELECT MIN(id) FROM patients GROUP BY full_name, age, gender
  )
);

-- Fix assessments.patient_id
UPDATE assessments
SET patient_id = (
  SELECT MIN(id) FROM patients p2
  WHERE p2.full_name = (SELECT full_name FROM patients p3 WHERE p3.id = assessments.patient_id)
    AND p2.age       = (SELECT age       FROM patients p3 WHERE p3.id = assessments.patient_id)
    AND p2.gender    = (SELECT gender    FROM patients p3 WHERE p3.id = assessments.patient_id)
)
WHERE patient_id IN (
  SELECT id FROM patients
  WHERE (full_name, age, gender) IN (
    SELECT full_name, age, gender FROM patients
    GROUP BY full_name, age, gender HAVING COUNT(*) > 1
  )
  AND id NOT IN (
    SELECT MIN(id) FROM patients GROUP BY full_name, age, gender
  )
);

-- Fix protocols.patient_id
UPDATE protocols
SET patient_id = (
  SELECT MIN(id) FROM patients p2
  WHERE p2.full_name = (SELECT full_name FROM patients p3 WHERE p3.id = protocols.patient_id)
    AND p2.age       = (SELECT age       FROM patients p3 WHERE p3.id = protocols.patient_id)
    AND p2.gender    = (SELECT gender    FROM patients p3 WHERE p3.id = protocols.patient_id)
)
WHERE patient_id IN (
  SELECT id FROM patients
  WHERE (full_name, age, gender) IN (
    SELECT full_name, age, gender FROM patients
    GROUP BY full_name, age, gender HAVING COUNT(*) > 1
  )
  AND id NOT IN (
    SELECT MIN(id) FROM patients GROUP BY full_name, age, gender
  )
);

-- Fix handovers.patient_id
UPDATE handovers
SET patient_id = (
  SELECT MIN(id) FROM patients p2
  WHERE p2.full_name = (SELECT full_name FROM patients p3 WHERE p3.id = handovers.patient_id)
    AND p2.age       = (SELECT age       FROM patients p3 WHERE p3.id = handovers.patient_id)
    AND p2.gender    = (SELECT gender    FROM patients p3 WHERE p3.id = handovers.patient_id)
)
WHERE patient_id IN (
  SELECT id FROM patients
  WHERE (full_name, age, gender) IN (
    SELECT full_name, age, gender FROM patients
    GROUP BY full_name, age, gender HAVING COUNT(*) > 1
  )
  AND id NOT IN (
    SELECT MIN(id) FROM patients GROUP BY full_name, age, gender
  )
);

-- ----------------------------------------------------------------
-- STEP 4: Delete duplicate patient rows — keep oldest (MIN id)
-- ----------------------------------------------------------------
DELETE FROM patients
WHERE id NOT IN (
  SELECT MIN(id) FROM patients GROUP BY full_name, age, gender
);

-- ----------------------------------------------------------------
-- STEP 5: Auto-generate patient_code for all existing patients
-- Format: PAT-1, PAT-2, PAT-3 ... based on row number by id
-- ----------------------------------------------------------------
UPDATE patients
SET patient_code = 'PAT-' || row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) AS row_num
  FROM patients
) AS numbered
WHERE patients.id = numbered.id
  AND patients.patient_code IS NULL;

-- ----------------------------------------------------------------
-- STEP 6: Add UNIQUE index on patient_code (partial — allows NULLs)
-- ----------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_patient_code
  ON patients (patient_code)
  WHERE patient_code IS NOT NULL;

-- ----------------------------------------------------------------
-- STEP 7: Verify — should return 0 rows if all duplicates removed
-- ----------------------------------------------------------------
-- SELECT full_name, age, gender, COUNT(*)
-- FROM patients
-- GROUP BY full_name, age, gender
-- HAVING COUNT(*) > 1;

-- SELECT patient_code, COUNT(*)
-- FROM patients
-- GROUP BY patient_code
-- HAVING COUNT(*) > 1;
