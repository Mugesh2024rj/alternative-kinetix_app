const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
// HELPER: Generate the next unique patient code
// Format: PAT-1, PAT-2, PAT-3 ...
// Finds the highest existing number and increments it.
// ─────────────────────────────────────────────────────────────
const generatePatientCode = async () => {
  const result = await pool.query(`
    SELECT patient_code FROM patients
    WHERE patient_code LIKE 'PAT-%'
    ORDER BY CAST(SUBSTRING(patient_code FROM 5) AS INTEGER) DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    // No patients yet — start from PAT-1
    return 'PAT-1';
  }

  // Extract the number from the last code e.g. 'PAT-12' → 12
  const lastCode = result.rows[0].patient_code;
  const lastNumber = parseInt(lastCode.replace('PAT-', ''), 10);
  return `PAT-${lastNumber + 1}`;
};

// ─────────────────────────────────────────────────────────────
// HELPER: Translate PostgreSQL unique constraint errors
// into clean human-readable messages.
// PostgreSQL error code 23505 = unique_violation
// ─────────────────────────────────────────────────────────────
const handleConstraintError = (err) => {
  if (err.code === '23505') {
    const detail = err.detail || '';
    if (detail.includes('patient_code')) return 'Patient code already exists';
    if (detail.includes('email'))        return 'Patient already exists with this email';
    return 'Patient already exists';
  }
  // Not a constraint error — return null so caller handles it
  return null;
};

// ─────────────────────────────────────────────────────────────
// HELPER: Check for duplicate patient before insert or update.
// Checks: same full_name + age + gender combination.
// Pass excludeId when updating so the patient being edited
// is not flagged as a duplicate of itself.
// Returns an error message string, or null if no duplicate.
// ─────────────────────────────────────────────────────────────
const checkPatientDuplicate = async (full_name, age, gender, excludeId = null) => {
  const exclude = excludeId ? `AND id != ${parseInt(excludeId)}` : '';

  const result = await pool.query(
    `SELECT id FROM patients
     WHERE LOWER(full_name) = LOWER($1)
       AND age = $2
       AND LOWER(gender) = LOWER($3)
       ${exclude}`,
    [full_name, age, gender]
  );

  if (result.rows.length > 0) {
    return 'Patient already exists with the same name, age, and gender';
  }

  return null; // No duplicate found
};

// ─────────────────────────────────────────────────────────────
// GET /api/patients/metrics
// ─────────────────────────────────────────────────────────────
const getPatientMetrics = async (req, res) => {
  try {
    const [visited, inHouse, cancelled, discharged] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM appointments WHERE DATE(appointment_time) = CURRENT_DATE'),
      pool.query("SELECT COUNT(*) FROM patients WHERE status = 'in-house'"),
      pool.query("SELECT COUNT(*) FROM appointments WHERE status = 'cancelled' AND DATE(appointment_time) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM patients WHERE status = 'discharged'")
    ]);
    res.json({
      patients_visited:  parseInt(visited.rows[0].count),
      in_house_patients: parseInt(inHouse.rows[0].count),
      cancelled:         parseInt(cancelled.rows[0].count),
      discharged:        parseInt(discharged.rows[0].count)
    });
  } catch (err) {
    console.error('getPatientMetrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch patient metrics' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patients
// ─────────────────────────────────────────────────────────────
const getPatients = async (req, res) => {
  try {
    const { search, status, doctor_id } = req.query;
    let query = `
      SELECT p.*, d.full_name as doctor_name, d.specialisation
      FROM patients p
      LEFT JOIN doctors d ON p.assigned_doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.full_name ILIKE $${params.length} OR p.condition ILIKE $${params.length} OR p.patient_code ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    if (doctor_id) {
      params.push(doctor_id);
      query += ` AND p.assigned_doctor_id = $${params.length}`;
    }
    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    // Deduplicate by id as a final safety net before sending to frontend
    const seen = new Set();
    const unique = result.rows.filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    res.json(unique);
  } catch (err) {
    console.error('getPatients error:', err.message);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patients/:id
// ─────────────────────────────────────────────────────────────
const getPatientById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, d.full_name as doctor_name, d.specialisation
      FROM patients p
      LEFT JOIN doctors d ON p.assigned_doctor_id = d.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getPatientById error:', err.message);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/patients
// Creates a new patient with full duplicate prevention
// and auto-generated patient_code
// ─────────────────────────────────────────────────────────────
const createPatient = async (req, res) => {
  const {
    full_name, age, gender, condition,
    assigned_doctor_id, phone, email,
    address, status, admission_date
  } = req.body;

  try {
    // LAYER 1: Pre-insert duplicate check
    const duplicateError = await checkPatientDuplicate(full_name, age, gender);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    // LAYER 2: Auto-generate a unique patient code (PAT-1, PAT-2 ...)
    const patient_code = await generatePatientCode();

    // LAYER 3: Insert the new patient
    const result = await pool.query(
      `INSERT INTO patients
         (full_name, patient_code, age, gender, condition,
          assigned_doctor_id, phone, email, address, status, admission_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        full_name, patient_code, age, gender, condition,
        assigned_doctor_id || null, phone || null, email || null,
        address || null, status || 'active', admission_date || new Date()
      ]
    );

    // Update the assigned doctor's patient count
    if (assigned_doctor_id) {
      await pool.query(
        'UPDATE doctors SET patient_count = patient_count + 1 WHERE id = $1',
        [assigned_doctor_id]
      );
    }

    res.status(201).json(result.rows[0]);

  } catch (err) {
    // LAYER 4: Catch any PostgreSQL constraint violation
    const constraintMsg = handleConstraintError(err);
    if (constraintMsg) {
      return res.status(409).json({ error: constraintMsg });
    }
    console.error('createPatient error:', err.message);
    res.status(500).json({ error: 'Failed to create patient' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/patients/:id
// Updates a patient with duplicate prevention
// (excludes the current patient from the duplicate check)
// ─────────────────────────────────────────────────────────────
const updatePatient = async (req, res) => {
  const {
    full_name, age, gender, condition,
    assigned_doctor_id, phone, email, address, status
  } = req.body;
  const patientId = req.params.id;

  try {
    // LAYER 1: Pre-update duplicate check — exclude current patient's own id
    const duplicateError = await checkPatientDuplicate(full_name, age, gender, patientId);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    // LAYER 2: Perform the update (patient_code is never changed after creation)
    const result = await pool.query(
      `UPDATE patients
       SET full_name=$1, age=$2, gender=$3, condition=$4,
           assigned_doctor_id=$5, phone=$6, email=$7,
           address=$8, status=$9, updated_at=NOW()
       WHERE id=$10
       RETURNING *`,
      [
        full_name, age, gender, condition,
        assigned_doctor_id || null, phone || null, email || null,
        address || null, status, patientId
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    // LAYER 3: Catch PostgreSQL constraint violations
    const constraintMsg = handleConstraintError(err);
    if (constraintMsg) {
      return res.status(409).json({ error: constraintMsg });
    }
    console.error('updatePatient error:', err.message);
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/patients/:id
// ─────────────────────────────────────────────────────────────
const deletePatient = async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    console.error('deletePatient error:', err.message);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patients/:id/protocol
// ─────────────────────────────────────────────────────────────
const getPatientProtocol = async (req, res) => {
  try {
    const protocol = await pool.query(
      'SELECT * FROM protocols WHERE patient_id = $1',
      [req.params.id]
    );
    if (!protocol.rows[0]) return res.json(null);

    const steps = await pool.query(`
      SELECT ps.*, d.full_name as doctor_name
      FROM protocol_steps ps
      LEFT JOIN doctors d ON ps.assigned_doctor_id = d.id
      WHERE ps.protocol_id = $1
      ORDER BY ps.step_number ASC
    `, [protocol.rows[0].id]);

    res.json({ ...protocol.rows[0], steps: steps.rows });
  } catch (err) {
    console.error('getPatientProtocol error:', err.message);
    res.status(500).json({ error: 'Failed to fetch protocol' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/patients/:id/protocol
// ─────────────────────────────────────────────────────────────
const createProtocol = async (req, res) => {
  const { patient_id, title, description, steps } = req.body;
  try {
    const proto = await pool.query(
      'INSERT INTO protocols (patient_id, title, description, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [patient_id, title, description, req.user.id]
    );
    if (steps && steps.length > 0) {
      for (const step of steps) {
        await pool.query(
          'INSERT INTO protocol_steps (protocol_id, step_number, phase, description, assigned_doctor_id, status, scheduled_date) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [proto.rows[0].id, step.step_number, step.phase, step.description, step.assigned_doctor_id, step.status || 'pending', step.scheduled_date]
        );
      }
    }
    res.status(201).json(proto.rows[0]);
  } catch (err) {
    console.error('createProtocol error:', err.message);
    res.status(500).json({ error: 'Failed to create protocol' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/patients/:id/protocol/steps/:stepId
// ─────────────────────────────────────────────────────────────
const updateProtocolStep = async (req, res) => {
  const { status, notes, completed_date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE protocol_steps SET status=$1, notes=$2, completed_date=$3 WHERE id=$4 RETURNING *',
      [status, notes, completed_date, req.params.stepId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateProtocolStep error:', err.message);
    res.status(500).json({ error: 'Failed to update protocol step' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/patients/protocols/all
// ─────────────────────────────────────────────────────────────
const getAllProtocols = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, p.full_name as patient_name, p.condition,
        COUNT(ps.id) as total_steps,
        COUNT(CASE WHEN ps.status = 'done' THEN 1 END) as completed_steps
      FROM protocols pr
      JOIN patients p ON pr.patient_id = p.id
      LEFT JOIN protocol_steps ps ON ps.protocol_id = pr.id
      GROUP BY pr.id, p.full_name, p.condition
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getAllProtocols error:', err.message);
    res.status(500).json({ error: 'Failed to fetch protocols' });
  }
};

module.exports = {
  getPatientMetrics, getPatients, getPatientById,
  createPatient, updatePatient, deletePatient,
  getPatientProtocol, createProtocol, updateProtocolStep, getAllProtocols
};
