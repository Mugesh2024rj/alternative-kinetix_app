const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    await pool.query(
      'INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'24 hours\')',
      [user.id, token.slice(-20), req.ip, req.headers['user-agent']]
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  await pool.query('UPDATE sessions SET is_active = false WHERE user_id = $1 AND is_active = true', [req.user.id]);
  res.json({ message: 'Logged out successfully' });
};

const getMe = async (req, res) => {
  res.json(req.user);
};

const getSessions = async (req, res) => {
  const result = await pool.query('SELECT id, ip_address, user_agent, created_at, expires_at, is_active FROM sessions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json(result.rows);
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login, logout, getMe, getSessions, changePassword };
