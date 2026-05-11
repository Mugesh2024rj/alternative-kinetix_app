const pool = require('../config/db');
const { recalculateDoctorPoints } = require('../services/performanceService');

// ─────────────────────────────────────────────
// HELPER: Auto-complete events whose end_date
// (or event_date when no end_date) has passed.
// Runs before any GET so status is always fresh.
// Skips cancelled events.
// ─────────────────────────────────────────────
const autoCompleteExpiredEvents = async () => {
  // Find upcoming/ongoing events whose time has passed
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

  // For each newly completed event, recalculate points for assigned doctors
  for (const row of expired.rows) {
    const assignments = await pool.query(
      `SELECT doctor_id FROM event_assignments
       WHERE event_id = $1 AND doctor_id IS NOT NULL`,
      [row.id]
    );
    for (const a of assignments.rows) {
      await recalculateDoctorPoints(a.doctor_id);
    }
  }

  if (expired.rows.length > 0) {
    console.log(`Auto-completed ${expired.rows.length} expired event(s)`);
  }
};

// GET /api/events
// ─────────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
    // Always sync expired events to 'completed' before returning
    await autoCompleteExpiredEvents();
    const result = await pool.query(`
      SELECT e.*, u.full_name as created_by_name, u.role as created_by_role,
        COUNT(ea.id) as participant_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_assignments ea ON ea.event_id = e.id
      GROUP BY e.id, u.full_name, u.role
      ORDER BY e.event_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getEvents error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/events/:id
// Returns full event details including assigned doctors
// with their specialisation, email, and current status
// ─────────────────────────────────────────────
const getEventById = async (req, res) => {
  try {
    await autoCompleteExpiredEvents();
    const event = await pool.query(`
      SELECT e.*, u.full_name as created_by_name, u.role as created_by_role
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });

    // Fetch assignments — join doctors directly via doctor_id column
    const assignments = await pool.query(`
      SELECT
        ea.id, ea.event_id, ea.user_id, ea.doctor_id, ea.role AS event_role, ea.assigned_at,
        COALESCE(d.full_name, u.full_name)   AS full_name,
        COALESCE(u.role, 'doctor')           AS role_in_system,
        d.id                                 AS doctor_id,
        d.specialisation,
        d.email                              AS doctor_email,
        d.status                             AS doctor_status,
        d.phone                              AS doctor_phone
      FROM event_assignments ea
      LEFT JOIN users u    ON ea.user_id = u.id
      LEFT JOIN doctors d  ON ea.doctor_id = d.id
      WHERE ea.event_id = $1
      ORDER BY ea.assigned_at ASC
    `, [req.params.id]);

    res.json({ ...event.rows[0], assignments: assignments.rows });
  } catch (err) {
    console.error('getEventById error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/events
// ─────────────────────────────────────────────
const createEvent = async (req, res) => {
  const { title, description, event_date, end_date, location, type, max_participants, assigned_doctors } = req.body;
  // assigned_doctors = array of doctor IDs (doctors.id, NOT user_id)
  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, event_date, end_date, location, type, max_participants, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, event_date, end_date, location, type, max_participants, req.user.id]
    );
    const newEvent = result.rows[0];

    if (Array.isArray(assigned_doctors) && assigned_doctors.length > 0) {
      for (const doctorId of assigned_doctors) {
        const docRow = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [doctorId]);
        const userId = docRow.rows[0]?.user_id || null;

        await pool.query(
          `INSERT INTO event_assignments (event_id, user_id, doctor_id, role)
           VALUES ($1, $2, $3, 'doctor')`,
          [newEvent.id, userId, doctorId]
        );

        await pool.query(
          `UPDATE doctors
           SET original_status = COALESCE(original_status, status), updated_at = NOW()
           WHERE id = $1 AND original_status IS NULL`,
          [doctorId]
        );
      }
    }

    res.status(201).json(newEvent);
  } catch (err) {
    console.error('createEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
  const { title, description, event_date, end_date, location, type, status, post_event_report } = req.body;
  try {
    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, event_date=$3, end_date=$4, location=$5, type=$6, status=$7, post_event_report=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [title, description, event_date, end_date, location, type, status, post_event_report, req.params.id]
    );
    const updatedEvent = result.rows[0];
    // When event is marked completed, recalculate points for all assigned doctors
    if (status === 'completed' && updatedEvent) {
      const assignments = await pool.query(
        `SELECT doctor_id FROM event_assignments
         WHERE event_id = $1 AND doctor_id IS NOT NULL`,
        [updatedEvent.id]
      );
      for (const row of assignments.rows) {
        await recalculateDoctorPoints(row.doctor_id);
      }
    }
    res.json(updatedEvent);
  } catch (err) {
    console.error('updateEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/events/:id/cancel
// Cancels an event and restores OD doctors' original status
// Does NOT delete any records
// ─────────────────────────────────────────────
const cancelEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    // Step 1: Mark event as cancelled
    const result = await pool.query(
      `UPDATE events SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [eventId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });

    // Restore original_status for all doctors assigned to this event
    await pool.query(`
      UPDATE doctors
      SET status = original_status, original_status = NULL, updated_at = NOW()
      WHERE original_status IS NOT NULL
        AND id IN (
          SELECT doctor_id FROM event_assignments
          WHERE event_id = $1 AND doctor_id IS NOT NULL
        )
    `, [eventId]);

    // Also restore by user_id for any legacy assignments
    await pool.query(`
      UPDATE doctors
      SET status = original_status, original_status = NULL, updated_at = NOW()
      WHERE original_status IS NOT NULL
        AND user_id IN (
          SELECT user_id FROM event_assignments
          WHERE event_id = $1 AND user_id IS NOT NULL AND doctor_id IS NULL
        )
    `, [eventId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('cancelEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/events/:id/assign
// Assigns a user to an event.
// If the user is a doctor, saves their current status
// as original_status and sets status to 'leave' (OD)
// only on the event date — not permanently.
// OD is computed dynamically in getDoctors via today_event.
// ─────────────────────────────────────────────
// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('deleteEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

const assignToEvent = async (req, res) => {
  const { user_id, role, doctor_id } = req.body;
  const eventId = req.params.id;
  try {
    const result = await pool.query(
      `INSERT INTO event_assignments (event_id, user_id, doctor_id, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, user_id || null, doctor_id || null, role || 'doctor']
    );

    if (doctor_id) {
      await pool.query(
        `UPDATE doctors
         SET original_status = COALESCE(original_status, status), updated_at = NOW()
         WHERE id = $1 AND original_status IS NULL`,
        [doctor_id]
      );
    } else if (role === 'doctor' && user_id) {
      await pool.query(
        `UPDATE doctors
         SET original_status = COALESCE(original_status, status), updated_at = NOW()
         WHERE user_id = $1 AND original_status IS NULL`,
        [user_id]
      );
    }

    res.status(201).json(result.rows[0] || { message: 'Already assigned' });
  } catch (err) {
    console.error('assignToEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, cancelEvent, assignToEvent, deleteEvent };
