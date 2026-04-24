const pool = require('../config/db');

const getPatientMetrics = async (req, res) => {
  try {
    const [visited, inHouse, cancelled, discharged] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM appointments WHERE DATE(appointment_time) = CURRENT_DATE'),
      pool.query("SELECT COUNT(*) FROM patients WHERE status = 'in-house'"),
      pool.query("SELECT COUNT(*) FROM appointments WHERE status = 'cancelled' AND DATE(appointment_time) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM patients WHERE status = 'discharged'")
    ]);
    res.json({
      patients_visited: parseInt(visited.rows[0].count),
      in_house_patients: parseInt(inHouse.rows[0].count),
      cancelled: parseInt(cancelled.rows[0].count),
      discharged: parseInt(discharged.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatients = async (req, res) => {
  try {
    const { search, status, doctor_id } = req.query;
    let query = `
      SELECT p.*, d.full_name as doctor_name, d.specialisation
      FROM patients p LEFT JOIN doctors d ON p.assigned_doctor_id = d.id WHERE 1=1
    `;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (p.full_name ILIKE $${params.length} OR p.condition ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND p.status = $${params.length}`; }
    if (doctor_id) { params.push(doctor_id); query += ` AND p.assigned_doctor_id = $${params.length}`; }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatientById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, d.full_name as doctor_name, d.specialisation
      FROM patients p LEFT JOIN doctors d ON p.assigned_doctor_id = d.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPatient = async (req, res) => {
  const { full_name, age, gender, condition, assigned_doctor_id, phone, email, address, status, admission_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO patients (full_name, age, gender, condition, assigned_doctor_id, phone, email, address, status, admission_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [full_name, age, gender, condition, assigned_doctor_id, phone, email, address, status || 'active', admission_date || new Date()]
    );
    if (assigned_doctor_id) {
      await pool.query('UPDATE doctors SET patient_count = patient_count + 1 WHERE id = $1', [assigned_doctor_id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePatient = async (req, res) => {
  const { full_name, age, gender, condition, assigned_doctor_id, phone, email, address, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE patients SET full_name=$1, age=$2, gender=$3, condition=$4, assigned_doctor_id=$5, phone=$6, email=$7, address=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [full_name, age, gender, condition, assigned_doctor_id, phone, email, address, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePatient = async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatientProtocol = async (req, res) => {
  try {
    const protocol = await pool.query('SELECT * FROM protocols WHERE patient_id = $1', [req.params.id]);
    if (!protocol.rows[0]) return res.json(null);
    const steps = await pool.query(`
      SELECT ps.*, d.full_name as doctor_name
      FROM protocol_steps ps LEFT JOIN doctors d ON ps.assigned_doctor_id = d.id
      WHERE ps.protocol_id = $1 ORDER BY ps.step_number ASC
    `, [protocol.rows[0].id]);
    res.json({ ...protocol.rows[0], steps: steps.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    res.status(500).json({ error: err.message });
  }
};

const updateProtocolStep = async (req, res) => {
  const { status, notes, completed_date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE protocol_steps SET status=$1, notes=$2, completed_date=$3 WHERE id=$4 RETURNING *',
      [status, notes, completed_date, req.params.stepId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPatientMetrics, getPatients, getPatientById, createPatient, updatePatient, deletePatient, getPatientProtocol, createProtocol, updateProtocolStep, getAllProtocols };
