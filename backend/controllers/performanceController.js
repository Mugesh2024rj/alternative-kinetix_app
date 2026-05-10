const pool = require('../config/db');

const getPerformanceMetrics = async (req, res) => {
  try {
    const [sessions, avgRating, cancellationRate, avgWait] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM appointments WHERE status = 'done'"),
      pool.query('SELECT COALESCE(AVG(rating),0) as avg FROM feedback'),
      pool.query(`SELECT ROUND(COUNT(CASE WHEN status='cancelled' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100, 1) as rate FROM appointments`),
      pool.query("SELECT COALESCE(AVG(duration),0) as avg FROM appointments WHERE status = 'done'")
    ]);
    res.json({
      total_sessions: parseInt(sessions.rows[0].count),
      avg_session_rating: parseFloat(avgRating.rows[0].avg).toFixed(1),
      cancellation_rate: parseFloat(cancellationRate.rows[0].rate || 0).toFixed(1),
      avg_wait_time: parseFloat(avgWait.rows[0].avg).toFixed(0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAppointmentTypeBreakdown = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT type, COUNT(*) as count FROM appointments GROUP BY type ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatientSatisfaction = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating ORDER BY rating DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDoctorPerformanceIndex = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.full_name,
        d.specialisation,
        COUNT(CASE WHEN a.status = 'done' THEN 1 END)                                    AS sessions_completed,
        COALESCE(AVG(f.rating), 0)                                                        AS feedback_score,
        ROUND(COUNT(CASE WHEN a.status = 'done' THEN 1 END)::numeric
              / NULLIF(COUNT(a.id), 0) * 100, 1)                                          AS on_time_percentage,
        COUNT(CASE WHEN h.status = 'pending' THEN 1 END)                                  AS handover_penalty,
        COUNT(DISTINCT CASE WHEN ev.status = 'completed' THEN ea.event_id END)            AS events_participated,
        COALESCE(dp.appointment_points, 0)                                                AS appointment_points,
        COALESCE(dp.event_points, 0)                                                      AS event_points,
        COALESCE(dp.feedback_points, 0)                                                   AS feedback_points,
        COALESCE(dp.penalty_points, 0)                                                    AS penalty_points,
        COALESCE(dp.total_points, 0)                                                      AS total_points
      FROM doctors d
      LEFT JOIN appointments a      ON a.doctor_id = d.id
      LEFT JOIN feedback f          ON f.doctor_id = d.id
      LEFT JOIN handovers h         ON h.from_doctor_id = d.id AND h.status = 'pending'
      LEFT JOIN event_assignments ea ON ea.user_id = d.user_id
      LEFT JOIN events ev           ON ev.id = ea.event_id
      LEFT JOIN doctor_points dp    ON dp.doctor_id = d.id
      GROUP BY d.id, d.full_name, d.specialisation, dp.appointment_points,
               dp.event_points, dp.feedback_points, dp.penalty_points, dp.total_points
      ORDER BY COALESCE(dp.total_points, 0) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCompletedAppointmentsChart = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.full_name as doctor,
        COUNT(CASE WHEN a.status = 'done' THEN 1 END) as completed
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.full_name
      ORDER BY completed DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSessionTrends = async (req, res) => {
  try {
    const { period } = req.query;
    let groupBy, dateFilter;
    if (period === 'weekly') {
      groupBy = "TO_CHAR(appointment_time, 'Dy')";
      dateFilter = "appointment_time >= NOW() - INTERVAL '7 days'";
    } else if (period === 'yearly') {
      groupBy = "TO_CHAR(appointment_time, 'Mon')";
      dateFilter = "appointment_time >= NOW() - INTERVAL '1 year'";
    } else {
      groupBy = "TO_CHAR(appointment_time, 'DD Mon')";
      dateFilter = "appointment_time >= NOW() - INTERVAL '30 days'";
    }
    const result = await pool.query(`
      SELECT ${groupBy} as period, COUNT(*) as sessions,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM appointments WHERE ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY MIN(appointment_time)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Recalculates points for ALL doctors from live DB data.
// Call this once after server start to seed doctor_points for existing data.
const recalculateAllDoctorPoints = async (req, res) => {
  try {
    const { recalculateDoctorPoints } = require('../services/performanceService');
    const doctors = await pool.query('SELECT id FROM doctors');
    for (const doc of doctors.rows) {
      await recalculateDoctorPoints(doc.id);
    }
    res.json({ message: `Recalculated points for ${doctors.rows.length} doctors` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPerformanceMetrics,
  getAppointmentTypeBreakdown,
  getPatientSatisfaction,
  getDoctorPerformanceIndex,
  getSessionTrends,
  getCompletedAppointmentsChart,
  recalculateAllDoctorPoints
};
