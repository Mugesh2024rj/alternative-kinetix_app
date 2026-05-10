const pool = require('../config/db');

/**
 * Recalculates a doctor's total points from live DB data and
 * upserts the result into doctor_points.
 * Also snapshots today's total into performance_history (one row per day).
 *
 * Point rules:
 *   +10  per completed appointment
 *   +15  per completed event participation
 *   + (rating x 20) per feedback row (summed)
 *   -10  per pending handover (unexplained penalty)
 *
 * @param {number} doctorId
 * @param {object} [client]  optional pg transaction client
 */
const recalculateDoctorPoints = async (doctorId, client) => {
  const db = client || pool;

  // 1. Completed appointments -> +10 each
  const apptRes = await db.query(
    `SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'done'`,
    [doctorId]
  );
  const appointmentPoints = parseInt(apptRes.rows[0].count) * 10;

  // 2. Completed event participations -> +15 each
  // Join via doctors.user_id -> event_assignments.user_id
  const eventRes = await db.query(
    `SELECT COUNT(*) FROM event_assignments ea
     JOIN events ev ON ev.id = ea.event_id AND ev.status = 'completed'
     WHERE ea.user_id = (SELECT user_id FROM doctors WHERE id = $1 AND user_id IS NOT NULL LIMIT 1)`,
    [doctorId]
  );
  const eventPoints = parseInt(eventRes.rows[0].count) * 15;

  // 3. Feedback -> rating x 20, summed
  const feedbackRes = await db.query(
    `SELECT COALESCE(SUM(rating * 20), 0) as pts FROM feedback WHERE doctor_id = $1`,
    [doctorId]
  );
  const feedbackPoints = parseInt(feedbackRes.rows[0].pts);

  // 4. Pending handovers -> -10 each (penalty)
  const handoverRes = await db.query(
    `SELECT COUNT(*) FROM handovers WHERE from_doctor_id = $1 AND status = 'pending'`,
    [doctorId]
  );
  const penaltyPoints = parseInt(handoverRes.rows[0].count) * 10;

  const totalPoints = appointmentPoints + eventPoints + feedbackPoints - penaltyPoints;

  // Upsert into doctor_points
  await db.query(
    `INSERT INTO doctor_points
       (doctor_id, appointment_points, event_points, feedback_points, penalty_points, total_points, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (doctor_id) DO UPDATE SET
       appointment_points = EXCLUDED.appointment_points,
       event_points       = EXCLUDED.event_points,
       feedback_points    = EXCLUDED.feedback_points,
       penalty_points     = EXCLUDED.penalty_points,
       total_points       = EXCLUDED.total_points,
       updated_at         = NOW()`,
    [doctorId, appointmentPoints, eventPoints, feedbackPoints, penaltyPoints, totalPoints]
  );

  // Snapshot today's total into performance_history (one row per doctor per day)
  await db.query(
    `INSERT INTO performance_history (doctor_id, total_points, recorded_on)
     VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (doctor_id, recorded_on) DO UPDATE SET total_points = EXCLUDED.total_points`,
    [doctorId, totalPoints]
  );

  return totalPoints;
};

module.exports = { recalculateDoctorPoints };
