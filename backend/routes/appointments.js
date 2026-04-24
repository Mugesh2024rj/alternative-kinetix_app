const router = require('express').Router();
const { getAppointments, createAppointment, updateAppointment, deleteAppointment, getAppointmentById } = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, authorize('admin', 'doctor', 'staff'), createAppointment);
router.put('/:id', authenticate, updateAppointment);
router.delete('/:id', authenticate, authorize('admin'), deleteAppointment);

module.exports = router;
