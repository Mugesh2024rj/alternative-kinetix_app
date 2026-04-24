const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, full_name, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role, full_name } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role, full_name) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, email, role, full_name',
      [username, email, hash, role, full_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  const { email, role, full_name, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET email=$1, role=$2, full_name=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING id, username, email, role, full_name, is_active',
      [email, role, full_name, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClinicSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM clinic_settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClinicSettings = async (req, res) => {
  const { key, value } = req.body;
  try {
    await pool.query(
      'INSERT INTO clinic_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()',
      [key, JSON.stringify(value)]
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const toggle2FA = async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query('UPDATE users SET two_fa_enabled=$1 WHERE id=$2', [enabled, req.user.id]);
    res.json({ message: `2FA ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getUsers, createUser, updateUser, getClinicSettings, updateClinicSettings, toggle2FA };
