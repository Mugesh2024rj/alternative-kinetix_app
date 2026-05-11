require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createTables, seedData } = require('./models/schema');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);
socketHandler(io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/handovers', require('./routes/handovers'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/events', require('./routes/events'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => res.json({ status: 'KINETIX API running' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await createTables();
    await seedData();

    // Seed doctor_points for any existing data on first run
    const { recalculateDoctorPoints } = require('./services/performanceService');
    const doctors = await require('./config/db').query('SELECT id FROM doctors');
    for (const doc of doctors.rows) {
      await recalculateDoctorPoints(doc.id);
    }

    // Auto-complete any events that expired before server started
    // and start the repeating 5-minute scheduler
    const { startEventScheduler } = require('./services/eventScheduler');
    startEventScheduler();

    server.listen(PORT, () => console.log(`KINETIX server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

start();
