const pool = require('../config/db');
const { recalculateDoctorPoints } = require('./performanceService');

/**
 * Marks all upcoming/ongoing events as 'completed' when their
 * end_date (or event_date) has passed, then recalculates doctor points.
 * Safe to call multiple times — only updates rows that need it.
 */
const autoCompleteExpiredEventsJob = async () => {
  try {
    const expired = await pool.query(`
      UPDATE events
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('upcoming', 'ongoing')
        AND (
          (end_date IS NOT NULL AND end_date < NOW())
          OR
          (end_date IS NULL AND event_date IS NOT NULL AND event_date < NOW())
        )
      RETURNING id
    `);

    for (const row of expired.rows) {
      const assignments = await pool.query(
        `SELECT d.id as doctor_id FROM event_assignments ea
         JOIN doctors d ON d.user_id = ea.user_id
         WHERE ea.event_id = $1`,
        [row.id]
      );
      for (const a of assignments.rows) {
        await recalculateDoctorPoints(a.doctor_id);
      }
    }

    if (expired.rows.length > 0) {
      console.log(`[Scheduler] Auto-completed ${expired.rows.length} expired event(s)`);
    }
  } catch (err) {
    console.error('[Scheduler] autoCompleteExpiredEventsJob error:', err.message);
  }
};

/**
 * Starts a repeating job every 5 minutes.
 * Call once from server.js after DB is ready.
 */
const startEventScheduler = () => {
  // Run immediately on start, then every 5 minutes
  autoCompleteExpiredEventsJob();
  setInterval(autoCompleteExpiredEventsJob, 5 * 60 * 1000);
  console.log('[Scheduler] Event auto-complete scheduler started (every 5 min)');
};

module.exports = { autoCompleteExpiredEventsJob, startEventScheduler };
