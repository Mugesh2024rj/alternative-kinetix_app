const pool = require('../config/db');

const getAppointments = async (req, res) => {
  try {
    const { search, status, type, doctor_id, date, view } = req.query;
    let query = `
      SELECT a.*, p.full_name as patient_name, p.age, p.gender,
             d.full_name as doctor_name, d.specialisation,
             sd.full_name as substitute_doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctors sd ON a.substitute_doctor_id = sd.id
      WHERE 1=1
    `;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (p.full_name ILIKE $${params.length} OR d.full_name ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND a.type = $${params.length}`; }
    if (doctor_id) { params.push(doctor_id); query += ` AND a.doctor_id = $${params.length}`; }
    if (date) { params.push(date); query += ` AND DATE(a.appointment_time) = $${params.length}`; }
    if (view === 'week') { query += ` AND a.appointment_time >= NOW() AND a.appointment_time <= NOW() + INTERVAL '7 days'`; }
    if (view === 'month') { query += ` AND EXTRACT(MONTH FROM a.appointment_time) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM a.appointment_time) = EXTRACT(YEAR FROM NOW())`; }
    query += ' ORDER BY a.appointment_time ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAppointment = async (req, res) => {
  const { patient_id, doctor_id, appointment_time, duration, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_time, duration, type, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [patient_id, doctor_id, appointment_time, duration || 30, type, 'scheduled']
    );
    await pool.query('UPDATE patients SET last_visit = $1 WHERE id = $2', [appointment_time, patient_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAppointment = async (req, res) => {
  const { status, notes, cancellation_reason, substitute_doctor_id, appointment_time, duration, type } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET status=$1, notes=$2, cancellation_reason=$3, substitute_doctor_id=$4, appointment_time=$5, duration=$6, type=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [status, notes, cancellation_reason, substitute_doctor_id, appointment_time, duration, type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, p.full_name as patient_name, p.age, p.gender, p.condition,
             d.full_name as doctor_name, d.specialisation,
             sd.full_name as substitute_doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctors sd ON a.substitute_doctor_id = sd.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAppointments, createAppointment, updateAppointment, deleteAppointment, getAppointmentById };
