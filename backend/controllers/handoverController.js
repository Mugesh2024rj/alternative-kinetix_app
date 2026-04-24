const pool = require('../config/db');

const getHandoverMetrics = async (req, res) => {
  try {
    const [total, today, pending, avgFeedback] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM handovers'),
      pool.query('SELECT COUNT(*) FROM handovers WHERE DATE(created_at) = CURRENT_DATE'),
      pool.query("SELECT COUNT(*) FROM handovers WHERE status = 'pending'"),
      pool.query('SELECT COALESCE(AVG(rating),0) as avg FROM feedback')
    ]);
    res.json({
      total_patients: parseInt(total.rows[0].count),
      today_patients: parseInt(today.rows[0].count),
      pending_transfers: parseInt(pending.rows[0].count),
      avg_feedback_score: parseFloat(avgFeedback.rows[0].avg).toFixed(1)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHandovers = async (req, res) => {
  try {
    const { status, priority, reason } = req.query;
    let query = `
      SELECT h.*, p.full_name as patient_name, p.condition,
             fd.full_name as from_doctor_name, td.full_name as to_doctor_name
      FROM handovers h
      JOIN patients p ON h.patient_id = p.id
      LEFT JOIN doctors fd ON h.from_doctor_id = fd.id
      LEFT JOIN doctors td ON h.to_doctor_id = td.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND h.status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND h.priority = $${params.length}`; }
    if (reason) { params.push(`%${reason}%`); query += ` AND h.transfer_reason ILIKE $${params.length}`; }
    query += ' ORDER BY h.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createHandover = async (req, res) => {
  const { patient_id, from_doctor_id, to_doctor_id, case_type, stage, transfer_reason, priority, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO handovers (patient_id, from_doctor_id, to_doctor_id, case_type, stage, transfer_reason, priority, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [patient_id, from_doctor_id, to_doctor_id, case_type, stage, transfer_reason, priority || 'medium', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateHandover = async (req, res) => {
  const { status, notes } = req.body;
  try {
    const result = await pool.query(
      'UPDATE handovers SET status=$1, notes=$2, completed_on=CASE WHEN $1=\'completed\' THEN NOW() ELSE completed_on END, updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStaffAvailability = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.full_name, d.specialisation, d.status, d.patient_count,
        COUNT(CASE WHEN a.status IN ('scheduled','in-progress') THEN 1 END) as active_appointments,
        ROUND(COUNT(CASE WHEN a.status IN ('scheduled','in-progress') THEN 1 END)::numeric / NULLIF(d.patient_count,0) * 100, 0) as load_percentage
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id AND DATE(a.appointment_time) = CURRENT_DATE
      GROUP BY d.id, d.full_name, d.specialisation, d.status, d.patient_count
      ORDER BY d.status, d.full_name
    `);
    const available = result.rows.filter(d => d.status === 'active').length;
    const unavailable = result.rows.filter(d => d.status !== 'active').length;
    res.json({ available, unavailable, doctors: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getHandoverMetrics, getHandovers, createHandover, updateHandover, getStaffAvailability };
