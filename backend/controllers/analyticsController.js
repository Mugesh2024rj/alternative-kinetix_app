const pool = require('../config/db');

const getAnalytics = async (req, res) => {
  try {
    const { period } = req.query;
    let interval = period === 'weekly' ? '7 days' : period === 'quarterly' ? '90 days' : '30 days';
    const [appointments, assessments, handovers, retention, staffUtil] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM appointments WHERE appointment_time >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(*) FROM assessments WHERE created_at >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(CASE WHEN status='completed' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100 as resolution FROM handovers WHERE created_at >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(DISTINCT patient_id)::numeric / NULLIF((SELECT COUNT(*) FROM patients),0) * 100 as rate FROM appointments WHERE appointment_time >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT ROUND(AVG(patient_count)::numeric / 20 * 100, 1) as utilization FROM doctors WHERE status = 'active'`)
    ]);
    res.json({
      appointments: parseInt(appointments.rows[0].count),
      assessments: parseInt(assessments.rows[0].count),
      handover_resolution: parseFloat(handovers.rows[0].resolution || 0).toFixed(1),
      retention: parseFloat(retention.rows[0].rate || 0).toFixed(1),
      staff_utilization: parseFloat(staffUtil.rows[0].utilization || 0).toFixed(1)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAppointmentTrends = async (req, res) => {
  try {
    const { period } = req.query;
    let groupBy = period === 'weekly' ? "TO_CHAR(appointment_time, 'Dy')" : period === 'quarterly' ? "TO_CHAR(appointment_time, 'Mon YYYY')" : "TO_CHAR(appointment_time, 'DD Mon')";
    let dateFilter = period === 'weekly' ? "appointment_time >= NOW() - INTERVAL '7 days'" : period === 'quarterly' ? "appointment_time >= NOW() - INTERVAL '90 days'" : "appointment_time >= NOW() - INTERVAL '30 days'";
    const result = await pool.query(`
      SELECT ${groupBy} as label, COUNT(*) as value FROM appointments WHERE ${dateFilter}
      GROUP BY ${groupBy} ORDER BY MIN(appointment_time)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAssessmentStatusPie = async (req, res) => {
  try {
    const result = await pool.query('SELECT status, COUNT(*) as value FROM assessments GROUP BY status');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDoctorWorkload = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.full_name as name, d.patient_count as patients,
        COUNT(a.id) as appointments
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id AND DATE(a.appointment_time) = CURRENT_DATE
      GROUP BY d.id, d.full_name, d.patient_count
      ORDER BY patients DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAnalytics, getAppointmentTrends, getAssessmentStatusPie, getDoctorWorkload };
