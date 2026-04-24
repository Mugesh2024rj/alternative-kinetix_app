const pool = require('../config/db');

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','doctor','staff')),
      full_name VARCHAR(255),
      avatar VARCHAR(500),
      is_active BOOLEAN DEFAULT true,
      two_fa_enabled BOOLEAN DEFAULT false,
      two_fa_secret VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      full_name VARCHAR(255) NOT NULL,
      specialisation VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','leave','inactive')),
      patient_count INTEGER DEFAULT 0,
      house_visit_count INTEGER DEFAULT 0,
      satisfaction_score DECIMAL(3,2) DEFAULT 0,
      performance_index DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      age INTEGER,
      gender VARCHAR(20),
      condition VARCHAR(500),
      assigned_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','in-house','discharged','cancelled')),
      last_visit DATE,
      admission_date DATE,
      discharge_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      appointment_time TIMESTAMP NOT NULL,
      duration INTEGER DEFAULT 30,
      type VARCHAR(100) CHECK (type IN ('Physio','Rehab','Neuro','Pain')),
      status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in-progress','done','cancelled')),
      notes TEXT,
      cancellation_reason TEXT,
      substitute_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS protocols (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS protocol_steps (
      id SERIAL PRIMARY KEY,
      protocol_id INTEGER REFERENCES protocols(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      phase VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_doctor_id INTEGER REFERENCES doctors(id),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('done','in-progress','pending')),
      notes TEXT,
      scheduled_date DATE,
      completed_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS house_visits (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      visit_date TIMESTAMP,
      next_visit_date TIMESTAMP,
      distance DECIMAL(8,2),
      vitals JSONB,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
      submitted_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS handovers (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      from_doctor_id INTEGER REFERENCES doctors(id),
      to_doctor_id INTEGER REFERENCES doctors(id),
      case_type VARCHAR(100),
      stage VARCHAR(100),
      transfer_reason TEXT,
      priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
      requested_on TIMESTAMP DEFAULT NOW(),
      completed_on TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id),
      title VARCHAR(255),
      type VARCHAR(100),
      score DECIMAL(5,2),
      max_score DECIMAL(5,2) DEFAULT 100,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','in-progress','completed')),
      scheduled_date TIMESTAMP,
      completed_date TIMESTAMP,
      notes TEXT,
      improvement_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(100) DEFAULT 'info' CHECK (type IN ('info','warning','success','error','approval')),
      is_read BOOLEAN DEFAULT false,
      reference_type VARCHAR(100),
      reference_id INTEGER,
      action_required BOOLEAN DEFAULT false,
      action_taken VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      generated_by INTEGER REFERENCES users(id),
      file_path VARCHAR(500),
      file_format VARCHAR(20),
      parameters JSONB,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','generating','completed','failed')),
      scheduled BOOLEAN DEFAULT false,
      schedule_config JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date TIMESTAMP,
      end_date TIMESTAMP,
      location VARCHAR(500),
      type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
      created_by INTEGER REFERENCES users(id),
      max_participants INTEGER,
      post_event_report TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS event_assignments (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(100),
      assigned_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id),
      appointment_id INTEGER REFERENCES appointments(id),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS clinic_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(500),
      ip_address VARCHAR(100),
      user_agent TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    )`
  ];

  for (const query of queries) {
    await pool.query(query);
  }
  console.log('All tables created successfully');
};

const seedData = async () => {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);

  await pool.query(`
    INSERT INTO users (username, email, password, role, full_name)
    VALUES ('admin', 'admin@kinetix.com', $1, 'admin', 'System Admin')
    ON CONFLICT (username) DO NOTHING
  `, [hash]);

  const doctorHash = await bcrypt.hash('doctor123', 10);
  await pool.query(`
    INSERT INTO users (username, email, password, role, full_name)
    VALUES ('dr.smith', 'smith@kinetix.com', $1, 'doctor', 'Dr. John Smith')
    ON CONFLICT (username) DO NOTHING
  `, [doctorHash]);

  await pool.query(`
    INSERT INTO doctors (full_name, specialisation, phone, email, status, patient_count, house_visit_count, satisfaction_score)
    VALUES 
      ('Dr. John Smith', 'Physiotherapy', '+1-555-0101', 'smith@kinetix.com', 'active', 12, 3, 4.5),
      ('Dr. Sarah Johnson', 'Neurology', '+1-555-0102', 'johnson@kinetix.com', 'active', 8, 1, 4.8),
      ('Dr. Michael Chen', 'Rehabilitation', '+1-555-0103', 'chen@kinetix.com', 'leave', 5, 0, 4.2),
      ('Dr. Emily Davis', 'Pain Management', '+1-555-0104', 'davis@kinetix.com', 'active', 15, 5, 4.7)
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    INSERT INTO patients (full_name, age, gender, condition, assigned_doctor_id, status, last_visit, admission_date)
    VALUES
      ('Alice Thompson', 45, 'Female', 'Lower back pain', 1, 'active', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days'),
      ('Bob Martinez', 62, 'Male', 'Post-stroke rehabilitation', 2, 'in-house', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 days'),
      ('Carol White', 38, 'Female', 'Sports injury - knee', 1, 'active', NOW() - INTERVAL '5 days', NOW() - INTERVAL '45 days'),
      ('David Brown', 55, 'Male', 'Chronic pain syndrome', 4, 'active', NOW(), NOW() - INTERVAL '60 days'),
      ('Emma Wilson', 29, 'Female', 'Neurological assessment', 2, 'active', NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days')
    ON CONFLICT DO NOTHING
  `);

  console.log('Seed data inserted');
};

module.exports = { createTables, seedData };
