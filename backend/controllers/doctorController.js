const pool = require('../config/db');

const getDoctorMetrics = async (req, res) => {
  try {
    const [present, houseVisits, outsideEvents, pendingApprovals, satisfaction] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM doctors WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE DATE(visit_date) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM event_assignments ea JOIN events e ON ea.event_id = e.id WHERE DATE(e.event_date) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE status = 'pending'"),
      pool.query('SELECT COALESCE(AVG(satisfaction_score),0) as avg FROM doctors WHERE status = $1', ['active'])
    ]);
    res.json({
      present_doctors: parseInt(present.rows[0].count),
      house_visits_today: parseInt(houseVisits.rows[0].count),
      outside_events: parseInt(outsideEvents.rows[0].count),
      pending_approvals: parseInt(pendingApprovals.rows[0].count),
      patient_satisfaction: parseFloat(satisfaction.rows[0].avg).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDoctors = async (req, res) => {
  try {
    const { search, status, specialisation } = req.query;
    let query = `
      SELECT d.*, 
        (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.id AND DATE(a.appointment_time) = CURRENT_DATE) as today_appointments
      FROM doctors d WHERE 1=1
    `;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (d.full_name ILIKE $${params.length} OR d.specialisation ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND d.status = $${params.length}`; }
    if (specialisation) { params.push(specialisation); query += ` AND d.specialisation = $${params.length}`; }
    query += ' ORDER BY d.full_name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Doctor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDoctor = async (req, res) => {
  const { full_name, specialisation, phone, email, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO doctors (full_name, specialisation, phone, email, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [full_name, specialisation, phone, email, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateDoctor = async (req, res) => {
  const { full_name, specialisation, phone, email, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE doctors SET full_name=$1, specialisation=$2, phone=$3, email=$4, status=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [full_name, specialisation, phone, email, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHouseVisitMetrics = async (req, res) => {
  try {
    const [activePatients, activeDoctors, pending] = await Promise.all([
      pool.query("SELECT COUNT(DISTINCT patient_id) FROM house_visits WHERE status IN ('pending','approved')"),
      pool.query("SELECT COUNT(DISTINCT doctor_id) FROM house_visits WHERE status IN ('pending','approved')"),
      pool.query("SELECT COUNT(*) FROM house_visits WHERE status = 'pending'")
    ]);
    res.json({
      active_hv_patients: parseInt(activePatients.rows[0].count),
      active_hv_doctors: parseInt(activeDoctors.rows[0].count),
      pending_entries: parseInt(pending.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    res.status(500).json({ error: err.message });
  }
};

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
        [admin.id, 'New House Visit Submission', `A new house visit has been submitted for review`, 'approval', 'house_visit', result.rows[0].id, true]
      );
      io.to(`user_${admin.id}`).emit('notification', notif.rows[0]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveHouseVisit = async (req, res) => {
  const { action } = req.body;
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = await pool.query(
      'UPDATE house_visits SET status=$1, approved_by=$2, approved_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, req.user.id, req.params.id]
    );
    if (result.rows[0]) {
      await pool.query('UPDATE doctors SET house_visit_count = house_visit_count + 1 WHERE id = $1', [result.rows[0].doctor_id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDoctorMetrics, getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, getHouseVisitMetrics, getHouseVisits, submitHouseVisit, approveHouseVisit };
