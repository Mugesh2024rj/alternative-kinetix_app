const pool = require('../config/db');

const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unread_count: unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleApprovalAction = async (req, res) => {
  const { action } = req.body;
  try {
    const notif = await pool.query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!notif.rows[0]) return res.status(404).json({ error: 'Notification not found' });
    await pool.query(
      'UPDATE notifications SET action_taken = $1, is_read = true WHERE id = $2',
      [action, req.params.id]
    );
    if (notif.rows[0].reference_type === 'house_visit') {
      await pool.query(
        'UPDATE house_visits SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
        [action === 'approve' ? 'approved' : 'rejected', req.user.id, notif.rows[0].reference_id]
      );
    }
    res.json({ message: `Action ${action} taken` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, handleApprovalAction };
