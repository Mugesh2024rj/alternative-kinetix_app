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
    let groupBy = period === 'weekly'
      ? "TO_CHAR(appointment_time, 'Dy')"
      : period === 'quarterly'
        ? "TO_CHAR(appointment_time, 'Mon YYYY')"
        : "TO_CHAR(appointment_time, 'DD Mon')";
    let dateFilter = period === 'weekly'
      ? "appointment_time >= NOW() - INTERVAL '7 days'"
      : period === 'quarterly'
        ? "appointment_time >= NOW() - INTERVAL '90 days'"
        : "appointment_time >= NOW() - INTERVAL '30 days'";
    const result = await pool.query(`
      SELECT ${groupBy} as label,
        COUNT(*) as value,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed
      FROM appointments WHERE ${dateFilter}
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
      SELECT
        d.full_name as name,
        d.patient_count as patients,
        COUNT(DISTINCT a.id) as appointments
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.full_name, d.patient_count
      ORDER BY patients DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEventsCompleted = async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = period === 'weekly'
      ? "ev.event_date >= NOW() - INTERVAL '7 days'"
      : period === 'quarterly'
        ? "ev.event_date >= NOW() - INTERVAL '90 days'"
        : "ev.event_date >= NOW() - INTERVAL '30 days'";
    const result = await pool.query(`
      SELECT d.full_name as doctor,
        COUNT(DISTINCT ea.event_id) as events_completed
      FROM doctors d
      LEFT JOIN event_assignments ea ON ea.doctor_id = d.id
      LEFT JOIN events ev ON ev.id = ea.event_id
        AND ev.status = 'completed'
        AND ${dateFilter}
      GROUP BY d.id, d.full_name
      ORDER BY events_completed DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Completed appointments over time (line chart)
// Returns total vs completed per period bucket
const getCompletedAppointmentsTrend = async (req, res) => {
  try {
    const { period } = req.query;
    let groupBy = period === 'weekly'
      ? "TO_CHAR(appointment_time, 'Dy')"
      : period === 'quarterly'
        ? "TO_CHAR(appointment_time, 'Mon YYYY')"
        : "TO_CHAR(appointment_time, 'DD Mon')";
    let dateFilter = period === 'weekly'
      ? "appointment_time >= NOW() - INTERVAL '7 days'"
      : period === 'quarterly'
        ? "appointment_time >= NOW() - INTERVAL '90 days'"
        : "appointment_time >= NOW() - INTERVAL '30 days'";
    const result = await pool.query(`
      SELECT ${groupBy} as label,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed
      FROM appointments WHERE ${dateFilter}
      GROUP BY ${groupBy} ORDER BY MIN(appointment_time)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Doctor participation count (horizontal bar chart)
// How many total appointments + events each doctor has participated in
const getDoctorParticipation = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.full_name as doctor,
        COUNT(DISTINCT a.id)  as total_appointments,
        COUNT(DISTINCT CASE WHEN ev.status = 'completed' THEN ea.event_id END) as total_events
      FROM doctors d
      LEFT JOIN appointments a       ON a.doctor_id = d.id
      LEFT JOIN event_assignments ea ON ea.doctor_id = d.id
      LEFT JOIN events ev            ON ev.id = ea.event_id
      GROUP BY d.id, d.full_name
      ORDER BY (COUNT(DISTINCT a.id) + COUNT(DISTINCT ea.event_id)) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Doctor performance growth over time (line chart)
// Reads from performance_history table — one point per doctor per day
const getDoctorPerformanceGrowth = async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = period === 'weekly'
      ? "ph.recorded_on >= CURRENT_DATE - INTERVAL '7 days'"
      : period === 'quarterly'
        ? "ph.recorded_on >= CURRENT_DATE - INTERVAL '90 days'"
        : "ph.recorded_on >= CURRENT_DATE - INTERVAL '30 days'";
    const result = await pool.query(`
      SELECT
        TO_CHAR(ph.recorded_on, 'DD Mon') as label,
        d.full_name as doctor,
        ph.total_points
      FROM performance_history ph
      JOIN doctors d ON d.id = ph.doctor_id
      WHERE ${dateFilter}
      ORDER BY ph.recorded_on ASC, d.full_name ASC
    `);
    // Pivot: group by label, one key per doctor
    const map = {};
    const doctors = [...new Set(result.rows.map(r => r.doctor))];
    for (const row of result.rows) {
      if (!map[row.label]) map[row.label] = { label: row.label };
      map[row.label][row.doctor] = parseInt(row.total_points);
    }
    res.json({ data: Object.values(map), doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Event participation count per doctor (pie chart)
const getEventParticipationPie = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.full_name as doctor, COUNT(ea.id) as value
      FROM doctors d
      LEFT JOIN event_assignments ea ON ea.doctor_id = d.id
      GROUP BY d.id, d.full_name
      ORDER BY value DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAnalytics,
  getAppointmentTrends,
  getAssessmentStatusPie,
  getDoctorWorkload,
  getEventsCompleted,
  getCompletedAppointmentsTrend,
  getDoctorParticipation,
  getDoctorPerformanceGrowth,
  getEventParticipationPie
};
