const pool = require('../config/db');

const getAssessmentMetrics = async (req, res) => {
  try {
    const [total, pending, completed, avgScore] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM assessments'),
      pool.query("SELECT COUNT(*) FROM assessments WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM assessments WHERE status = 'completed'"),
      pool.query("SELECT COALESCE(AVG(score),0) as avg FROM assessments WHERE status = 'completed'")
    ]);
    res.json({
      total_assessments: parseInt(total.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      avg_score: parseFloat(avgScore.rows[0].avg).toFixed(1)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAssessments = async (req, res) => {
  try {
    const { status, patient_id } = req.query;
    let query = `
      SELECT a.*, p.full_name as patient_name, d.full_name as doctor_name
      FROM assessments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    if (patient_id) { params.push(patient_id); query += ` AND a.patient_id = $${params.length}`; }
    query += ' ORDER BY a.scheduled_date ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAssessment = async (req, res) => {
  const { patient_id, doctor_id, title, type, max_score, scheduled_date, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO assessments (patient_id, doctor_id, title, type, max_score, scheduled_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [patient_id, doctor_id, title, type, max_score || 100, scheduled_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAssessment = async (req, res) => {
  const { status, score, notes, improvement_notes, completed_date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE assessments SET status=$1, score=$2, notes=$3, improvement_notes=$4, completed_date=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [status, score, notes, improvement_notes, completed_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAssessmentMetrics, getAssessments, createAssessment, updateAssessment };
