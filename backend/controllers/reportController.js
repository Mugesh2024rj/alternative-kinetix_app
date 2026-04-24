const pool = require('../config/db');

const getReports = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name as generated_by_name
      FROM reports r LEFT JOIN users u ON r.generated_by = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generateReport = async (req, res) => {
  const { title, type, parameters, file_format } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reports (title, type, generated_by, file_format, parameters, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title, type, req.user.id, file_format || 'pdf', JSON.stringify(parameters || {}), 'generating']
    );
    setTimeout(async () => {
      await pool.query('UPDATE reports SET status = $1 WHERE id = $2', ['completed', result.rows[0].id]);
    }, 2000);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const scheduleReport = async (req, res) => {
  const { title, type, schedule_config, file_format } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reports (title, type, generated_by, file_format, scheduled, schedule_config, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [title, type, req.user.id, file_format || 'pdf', true, JSON.stringify(schedule_config), 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReportData = async (req, res) => {
  const { type, from_date, to_date } = req.query;
  try {
    let data = {};
    if (type === 'clinical_handover') {
      const result = await pool.query(`
        SELECT h.*, p.full_name as patient_name, fd.full_name as from_doctor, td.full_name as to_doctor
        FROM handovers h JOIN patients p ON h.patient_id = p.id
        LEFT JOIN doctors fd ON h.from_doctor_id = fd.id LEFT JOIN doctors td ON h.to_doctor_id = td.id
        WHERE h.created_at BETWEEN $1 AND $2
      `, [from_date || '2000-01-01', to_date || new Date()]);
      data = result.rows;
    } else if (type === 'appointment_summary') {
      const result = await pool.query(`
        SELECT a.*, p.full_name as patient_name, d.full_name as doctor_name
        FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN doctors d ON a.doctor_id = d.id
        WHERE a.appointment_time BETWEEN $1 AND $2
      `, [from_date || '2000-01-01', to_date || new Date()]);
      data = result.rows;
    } else if (type === 'staff_utilization') {
      const result = await pool.query(`
        SELECT d.full_name, d.specialisation, d.status, d.patient_count,
          COUNT(a.id) as total_appointments,
          COUNT(CASE WHEN a.status = 'done' THEN 1 END) as completed
        FROM doctors d LEFT JOIN appointments a ON a.doctor_id = d.id
        GROUP BY d.id, d.full_name, d.specialisation, d.status, d.patient_count
      `);
      data = result.rows;
    } else if (type === 'house_visit_analytics') {
      const result = await pool.query(`
        SELECT hv.*, d.full_name as doctor_name, p.full_name as patient_name
        FROM house_visits hv JOIN doctors d ON hv.doctor_id = d.id JOIN patients p ON hv.patient_id = p.id
        WHERE hv.created_at BETWEEN $1 AND $2
      `, [from_date || '2000-01-01', to_date || new Date()]);
      data = result.rows;
    } else if (type === 'assessment_audit') {
      const result = await pool.query(`
        SELECT a.*, p.full_name as patient_name, d.full_name as doctor_name
        FROM assessments a JOIN patients p ON a.patient_id = p.id LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.created_at BETWEEN $1 AND $2
      `, [from_date || '2000-01-01', to_date || new Date()]);
      data = result.rows;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getReports, generateReport, scheduleReport, getReportData };
