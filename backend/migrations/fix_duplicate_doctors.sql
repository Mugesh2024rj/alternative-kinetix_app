-- ============================================================
-- KINETIX — Safe Migration: Fix Duplicate Doctors
-- Run this ONCE in pgAdmin4 Query Tool on kinetix_db
-- ============================================================

-- STEP 1: Re-assign appointments.doctor_id to oldest duplicate
UPDATE appointments
SET doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = appointments.doctor_id)
)
WHERE doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 2: Re-assign appointments.substitute_doctor_id
UPDATE appointments
SET substitute_doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = appointments.substitute_doctor_id)
)
WHERE substitute_doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 3: Re-assign patients.assigned_doctor_id
UPDATE patients
SET assigned_doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = patients.assigned_doctor_id)
)
WHERE assigned_doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 4: Re-assign house_visits.doctor_id
UPDATE house_visits
SET doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = house_visits.doctor_id)
)
WHERE doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 5: Re-assign handovers.from_doctor_id
UPDATE handovers
SET from_doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = handovers.from_doctor_id)
)
WHERE from_doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 6: Re-assign handovers.to_doctor_id
UPDATE handovers
SET to_doctor_id = (
  SELECT MIN(id) FROM doctors d2
  WHERE d2.email = (SELECT email FROM doctors d3 WHERE d3.id = handovers.to_doctor_id)
)
WHERE to_doctor_id IN (
  SELECT id FROM doctors
  WHERE email IN (SELECT email FROM doctors GROUP BY email HAVING COUNT(*) > 1)
  AND id NOT IN (SELECT MIN(id) FROM doctors GROUP BY email)
);

-- STEP 7: Delete duplicate doctors — keep only the oldest (MIN id) per email
DELETE FROM doctors
WHERE id NOT IN (
  SELECT MIN(id) FROM doctors GROUP BY email
)
AND email IS NOT NULL;

-- STEP 8: Add partial UNIQUE index on email (allows multiple NULLs safely)
CREATE UNIQUE INDEX IF NOT EXISTS unique_doctor_email
ON doctors (email)
WHERE email IS NOT NULL;

-- STEP 9: Verify — should return 0 rows
-- SELECT email, COUNT(*) FROM doctors GROUP BY email HAVING COUNT(*) > 1;
