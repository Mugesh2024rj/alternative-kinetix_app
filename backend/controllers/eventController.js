const pool = require('../config/db');

const getEvents = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.full_name as created_by_name,
        COUNT(ea.id) as participant_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_assignments ea ON ea.event_id = e.id
      GROUP BY e.id, u.full_name
      ORDER BY e.event_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });
    const assignments = await pool.query(`
      SELECT ea.*, u.full_name, u.role FROM event_assignments ea JOIN users u ON ea.user_id = u.id WHERE ea.event_id = $1
    `, [req.params.id]);
    res.json({ ...event.rows[0], assignments: assignments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEvent = async (req, res) => {
  const { title, description, event_date, end_date, location, type, max_participants } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, event_date, end_date, location, type, max_participants, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, event_date, end_date, location, type, max_participants, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEvent = async (req, res) => {
  const { title, description, event_date, end_date, location, type, status, post_event_report } = req.body;
  try {
    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, event_date=$3, end_date=$4, location=$5, type=$6, status=$7, post_event_report=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [title, description, event_date, end_date, location, type, status, post_event_report, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const assignToEvent = async (req, res) => {
  const { user_id, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO event_assignments (event_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.id, user_id, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, assignToEvent };
