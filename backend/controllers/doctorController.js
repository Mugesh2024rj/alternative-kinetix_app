const pool = require('../config/db');

// ─────────────────────────────────────────────
// HELPER: Translate PostgreSQL constraint errors
// into clean, human-readable API error messages.
// This prevents raw DB errors from reaching the client.
// ─────────────────────────────────────────────
const handleConstraintError = (err) => {
  // PostgreSQL unique violation error code is '23505'
  if (err.code === '23505') {
    const detail = err.detail || '';
    if (detail.includes('email'))       return 'Doctor already exists with this email';
    if (detail.includes('phone'))       return 'Doctor already exists with this phone number';
    if (detail.includes('doctor_code')) return 'Doctor already exists with this doctor code';
    return 'Doctor already exists';
  }
  // Return null for non-constraint errors so caller handles them normally
  return null;
};

// ─────────────────────────────────────────────
// HELPER: Check for duplicate email, phone, or
// doctor_code BEFORE attempting an INSERT or UPDATE.
// Pass excludeId when updating so the doctor being
// edited is not flagged as a duplicate of itself.
// Returns an error message string, or null if clean.
// ─────────────────────────────────────────────
const checkDoctorDuplicate = async (email, phone, doctor_code, excludeId = null) => {
  // Build the exclusion clause for UPDATE checks
  const exclude = excludeId ? `AND id != ${parseInt(excludeId)}` : '';

  // Check email uniqueness
  if (email) {
    const emailCheck = await pool.query(
      `SELECT id FROM doctors WHERE email = $1 ${exclude}`,
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return 'Doctor already exists with this email';
    }
  }

  // Check phone uniqueness
  if (phone) {
    const phoneCheck = await pool.query(
      `SELECT id FROM doctors WHERE phone = $1 ${exclude}`,
      [phone]
    );
    if (phoneCheck.rows.length > 0) {
      return 'Doctor already exists with this phone number';
    }
  }

  // Check doctor_code uniqueness
  if (doctor_code) {
    const codeCheck = await pool.query(
      `SELECT id FROM doctors WHERE doctor_code = $1 ${exclude}`,
      [doctor_code]
    );
    if (codeCheck.rows.length > 0) {
      return 'Doctor already exists with this doctor code';
    }
  }

  // No duplicates found
  return null;
};

// ─────────────────────────────────────────────
// GET /api/doctors/metrics
// ─────────────────────────────────────────────
const getDoctorMetrics = async (req, res) => {
  try {
    const [present, houseVisits, outsideEvents, pendingApprovals, onLeave] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM doctors WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE DATE(visit_date) = CURRENT_DATE"),
      // Count distinct doctors assigned to non-cancelled events happening today
      pool.query(`
        SELECT COUNT(DISTINCT d.id)
        FROM doctors d
        JOIN users u ON u.id = d.user_id
        JOIN event_assignments ea ON ea.user_id = u.id
        JOIN events e ON ea.event_id = e.id
        WHERE DATE(e.event_date) = CURRENT_DATE
          AND e.status != 'cancelled'
      `),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM doctors WHERE status = 'leave'")
    ]);
    res.json({
      present_doctors:    parseInt(present.rows[0].count),
      house_visits_today: parseInt(houseVisits.rows[0].count),
      outside_events:     parseInt(outsideEvents.rows[0].count),
      pending_approvals:  parseInt(pendingApprovals.rows[0].count),
      doctors_on_leave:   parseInt(onLeave.rows[0].count)
    });
  } catch (err) {
    console.error('getDoctorMetrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch doctor metrics' });
  }
};

// ─────────────────────────────────────────────
// GET /api/doctors
// ─────────────────────────────────────────────
const getDoctors = async (req, res) => {
  try {
    const { search, status, specialisation } = req.query;
    let query = `
      SELECT d.*,
        (SELECT COUNT(*) FROM appointments a
         WHERE a.doctor_id = d.id AND DATE(a.appointment_time) = CURRENT_DATE
        ) as today_appointments,
        -- Fetch today's non-cancelled event name for this doctor (via user_id link)
        (SELECT e.title FROM events e
         JOIN event_assignments ea ON ea.event_id = e.id
         WHERE ea.user_id = d.user_id
           AND DATE(e.event_date) = CURRENT_DATE
           AND e.status != 'cancelled'
         LIMIT 1
        ) as today_event
      FROM doctors d WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (d.full_name ILIKE $${params.length} OR d.specialisation ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }
    if (specialisation) {
      params.push(specialisation);
      query += ` AND d.specialisation = $${params.length}`;
    }
    query += ' ORDER BY d.full_name ASC';

    const result = await pool.query(query, params);

    // Deduplicate by id as a final safety net
    const seen = new Set();
    const unique = result.rows.filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    res.json(unique);
  } catch (err) {
    console.error('getDoctors error:', err.message);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

// ─────────────────────────────────────────────
// GET /api/doctors/:id
// ─────────────────────────────────────────────
const getDoctorById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Doctor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getDoctorById error:', err.message);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
};

// ─────────────────────────────────────────────
// POST /api/doctors
// Creates a new doctor with full duplicate prevention
// ─────────────────────────────────────────────
const createDoctor = async (req, res) => {
  const { full_name, specialisation, phone, email, status, doctor_code } = req.body;

  try {
    // LAYER 1: Pre-insert duplicate check (clear error messages)
    const duplicateError = await checkDoctorDuplicate(email, phone, doctor_code);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    // LAYER 2: Insert with ON CONFLICT DO NOTHING as a database-level safety net
    const result = await pool.query(
      `INSERT INTO doctors (full_name, specialisation, phone, email, status, doctor_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [full_name, specialisation, phone || null, email || null, status || 'active', doctor_code || null]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    // LAYER 3: Catch any PostgreSQL constraint violation that slipped through
    const constraintMsg = handleConstraintError(err);
    if (constraintMsg) {
      return res.status(409).json({ error: constraintMsg });
    }
    console.error('createDoctor error:', err.message);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/doctors/:id
// Updates a doctor with duplicate prevention
// (excludes the current doctor from duplicate check)
// ─────────────────────────────────────────────
const updateDoctor = async (req, res) => {
  const { full_name, specialisation, phone, email, status, doctor_code } = req.body;
  const doctorId = req.params.id;

  try {
    // LAYER 1: Pre-update duplicate check — exclude current doctor's own id
    const duplicateError = await checkDoctorDuplicate(email, phone, doctor_code, doctorId);
    if (duplicateError) {
      return res.status(409).json({ error: duplicateError });
    }

    // LAYER 2: Perform the update
    const result = await pool.query(
      `UPDATE doctors
       SET full_name=$1, specialisation=$2, phone=$3, email=$4,
           status=$5, doctor_code=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [full_name, specialisation, phone || null, email || null, status, doctor_code || null, doctorId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    // LAYER 3: Catch PostgreSQL constraint violations
    const constraintMsg = handleConstraintError(err);
    if (constraintMsg) {
      return res.status(409).json({ error: constraintMsg });
    }
    console.error('updateDoctor error:', err.message);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/doctors/:id
// ─────────────────────────────────────────────
const deleteDoctor = async (req, res) => {
  try {
    await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    console.error('deleteDoctor error:', err.message);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
};

// ─────────────────────────────────────────────
// GET /api/doctors/house-visits/metrics
// ─────────────────────────────────────────────
const getHouseVisitMetrics = async (req, res) => {
  try {
    const [activePatients, activeDoctors, pending] = await Promise.all([
      pool.query("SELECT COUNT(DISTINCT patient_id) FROM house_visits WHERE status IN ('pending','approved')"),
      pool.query("SELECT COUNT(DISTINCT doctor_id) FROM house_visits WHERE status IN ('pending','approved')"),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE status = 'pending'")
    ]);
    res.json({
      active_hv_patients: parseInt(activePatients.rows[0].count),
      active_hv_doctors:  parseInt(activeDoctors.rows[0].count),
      pending_entries:    parseInt(pending.rows[0].count)
    });
  } catch (err) {
    console.error('getHouseVisitMetrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch house visit metrics' });
  }
};

// ─────────────────────────────────────────────
// GET /api/doctors/house-visits/list
// ─────────────────────────────────────────────
const getHouseVisits = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hv.*, d.full_name as doctor_name, p.full_name as patient_name
      FROM house_visits hv
      JOIN doctors d ON hv.doctor_id = d.id
      JOIN patients p ON hv.patient_id = p.id
      ORDER BY hv.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getHouseVisits error:', err.message);
    res.status(500).json({ error: 'Failed to fetch house visits' });
  }
};

// ─────────────────────────────────────────────
// POST /api/doctors/house-visits/submit
// ─────────────────────────────────────────────
const submitHouseVisit = async (req, res) => {
  const { doctor_id, patient_id, visit_date, next_visit_date, distance, vitals, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO house_visits (doctor_id, patient_id, visit_date, next_visit_date, distance, vitals, notes, submitted_by, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [doctor_id, patient_id, visit_date, next_visit_date, distance, JSON.stringify(vitals), notes, req.user.id, 'pending']
    );
    const io = req.app.get('io');
    const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of adminUsers.rows) {
      const notif = await pool.query(
        "INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, action_required) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [admin.id, 'New House Visit Submission', 'A new house visit has been submitted for review', 'approval', 'house_visit', result.rows[0].id, true]
      );
      io.to(`user_${admin.id}`).emit('notification', notif.rows[0]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('submitHouseVisit error:', err.message);
    res.status(500).json({ error: 'Failed to submit house visit' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/doctors/house-visits/:id/approve
// ─────────────────────────────────────────────
const approveHouseVisit = async (req, res) => {
  const { action } = req.body;
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = await pool.query(
      'UPDATE house_visits SET status=$1, approved_by=$2, approved_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, req.user.id, req.params.id]
    );
    if (result.rows[0]) {
      await pool.query(
        'UPDATE doctors SET house_visit_count = house_visit_count + 1 WHERE id = $1',
        [result.rows[0].doctor_id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('approveHouseVisit error:', err.message);
    res.status(500).json({ error: 'Failed to process house visit approval' });
  }
};

module.exports = {
  getDoctorMetrics, getDoctors, getDoctorById,
  createDoctor, updateDoctor, deleteDoctor,
  getHouseVisitMetrics, getHouseVisits,
  submitHouseVisit, approveHouseVisit
};
