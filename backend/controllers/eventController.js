const pool = require('../config/db');
const { recalculateDoctorPoints } = require('../services/performanceService');

// GET /api/events
// ─────────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
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
    const event = await pool.query(`
      SELECT e.*, u.full_name as created_by_name, u.role as created_by_role
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });

    // Fetch assignments — join doctors table to get specialisation, email, status
    const assignments = await pool.query(`
      SELECT
        ea.id, ea.event_id, ea.user_id, ea.role AS event_role, ea.assigned_at,
        u.full_name, u.role AS role_in_system,
        d.id         AS doctor_id,
        d.specialisation,
        d.email      AS doctor_email,
        d.status     AS doctor_status,
        d.phone      AS doctor_phone
      FROM event_assignments ea
      JOIN users u ON ea.user_id = u.id
      LEFT JOIN doctors d ON d.user_id = u.id
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
  const { title, description, event_date, end_date, location, type, max_participants } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, event_date, end_date, location, type, max_participants, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, event_date, end_date, location, type, max_participants, req.user.id]
    );
    res.status(201).json(result.rows[0]);
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
        `SELECT d.id as doctor_id FROM event_assignments ea
         JOIN doctors d ON d.user_id = ea.user_id
         WHERE ea.event_id = $1`,
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

    // Step 2: Restore original_status for all doctors assigned to this event
    // Only restore if their original_status was saved (not null)
    await pool.query(`
      UPDATE doctors
      SET status = original_status, original_status = NULL, updated_at = NOW()
      WHERE original_status IS NOT NULL
        AND user_id IN (
          SELECT user_id FROM event_assignments WHERE event_id = $1
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
const assignToEvent = async (req, res) => {
  const { user_id, role } = req.body;
  const eventId = req.params.id;
  try {
    // Insert assignment — unique index prevents duplicates silently
    const result = await pool.query(
      `INSERT INTO event_assignments (event_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING *`,
      [eventId, user_id, role]
    );

    // If the assigned user is a doctor, save their original_status
    // so we can restore it when the event is cancelled or ends
    if (role === 'doctor') {
      await pool.query(`
        UPDATE doctors
        SET original_status = COALESCE(original_status, status),
            updated_at = NOW()
        WHERE user_id = $1
          AND original_status IS NULL
      `, [user_id]);
    }

    res.status(201).json(result.rows[0] || { message: 'Already assigned' });
  } catch (err) {
    console.error('assignToEvent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, cancelEvent, assignToEvent };
