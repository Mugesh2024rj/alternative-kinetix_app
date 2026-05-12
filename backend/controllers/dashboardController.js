const pool = require('../config/db');

const getDashboardMetrics = async (req, res) => {
  try {
    const [patients, todayPatients, pendingTransfers, avgFeedback, handovers, houseVisits, inClinic, assessments] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM patients WHERE status != $1', ['discharged']),
      pool.query('SELECT COUNT(*) FROM appointments WHERE DATE(appointment_time) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM handovers WHERE status = $1', ['pending']),
      pool.query('SELECT COALESCE(AVG(rating),0) as avg FROM feedback'),
      pool.query('SELECT COUNT(*) FROM handovers WHERE DATE(created_at) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM house_visits WHERE DATE(visit_date) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) FROM patients WHERE status = $1', ['in-house']),
      pool.query('SELECT COUNT(*) FROM assessments WHERE status != $1', ['completed'])
    ]);
    res.json({
      total_patients: parseInt(patients.rows[0].count),
      today_patients: parseInt(todayPatients.rows[0].count),
      pending_transfers: parseInt(pendingTransfers.rows[0].count),
      avg_feedback_score: parseFloat(avgFeedback.rows[0].avg).toFixed(1),
      handovers: parseInt(handovers.rows[0].count),
      house_visits: parseInt(houseVisits.rows[0].count),
      available_in_clinic: parseInt(inClinic.rows[0].count),
      assessments: parseInt(assessments.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTodaySchedule = async (req, res) => {
  try {
    // Auto-complete past scheduled appointments
    await pool.query(`
      UPDATE appointments
      SET status = 'done', updated_at = NOW()
      WHERE status = 'scheduled'
        AND (appointment_time + (COALESCE(duration, 30) || ' minutes')::interval) < NOW()
    `);
    const result = await pool.query(`
      SELECT a.id, a.appointment_time, a.type, a.status, a.duration,
             p.full_name as patient_name, d.full_name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE DATE(a.appointment_time) = CURRENT_DATE
      ORDER BY a.appointment_time ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, message, type, created_at, user_name
      FROM (
        SELECT n.id, n.title, n.message, n.type, n.created_at,
               COALESCE(u.full_name, 'System') AS user_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id

        UNION ALL

        SELECT 1000000 + a.id AS id,
               CONCAT('Completed appointment - ', p.full_name) AS title,
               CONCAT('Appointment for ', p.full_name, ' with ', d.full_name, ' completed at ', TO_CHAR(a.appointment_time, 'HH12:MI AM')) AS message,
               'success' AS type,
               COALESCE(a.updated_at, a.appointment_time, NOW()) AS created_at,
               COALESCE(d.full_name, 'System') AS user_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.status = 'done'

        UNION ALL

        SELECT 2000000 + e.id AS id,
               CONCAT('Completed event - ', e.title) AS title,
               CONCAT('Event "', e.title, '" completed at ', TO_CHAR(COALESCE(e.end_date, e.event_date), 'HH12:MI AM')) AS message,
               'info' AS type,
               COALESCE(e.updated_at, COALESCE(e.end_date, e.event_date), NOW()) AS created_at,
               COALESCE(u.full_name, 'System') AS user_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status = 'completed'

        UNION ALL

        SELECT 3000000 + asmt.id AS id,
               CONCAT('Assessment completed - ', asmt.title) AS title,
               CONCAT('Assessment ', COALESCE(asmt.title, 'Review'), ' for ', COALESCE(p.full_name, 'patient'), ' completed by ', COALESCE(d.full_name, 'System')) AS message,
               'success' AS type,
               COALESCE(asmt.completed_date, asmt.updated_at, asmt.created_at, NOW()) AS created_at,
               COALESCE(d.full_name, 'System') AS user_name
        FROM assessments asmt
        LEFT JOIN patients p ON asmt.patient_id = p.id
        LEFT JOIN doctors d ON asmt.doctor_id = d.id
        WHERE asmt.status = 'completed'
      ) feed
      ORDER BY created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCalendarEvents = async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(`
      SELECT id, title, event_date as start, end_date as end, type, status
      FROM events
      WHERE EXTRACT(MONTH FROM event_date) = $1 AND EXTRACT(YEAR FROM event_date) = $2
        AND status != 'cancelled'
      ORDER BY event_date ASC
    `, [month || new Date().getMonth() + 1, year || new Date().getFullYear()]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardMetrics, getTodaySchedule, getRecentActivity, getCalendarEvents };
