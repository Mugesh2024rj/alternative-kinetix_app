const router = require('express').Router();
const { getPatientMetrics, getPatients, getPatientById, createPatient, updatePatient, deletePatient, getPatientProtocol, createProtocol, updateProtocolStep, getAllProtocols } = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/metrics', authenticate, getPatientMetrics);
router.get('/protocols/all', authenticate, getAllProtocols);
router.get('/', authenticate, getPatients);
router.get('/:id', authenticate, getPatientById);
router.post('/', authenticate, authorize('admin', 'doctor'), createPatient);
router.put('/:id', authenticate, authorize('admin', 'doctor'), updatePatient);
router.delete('/:id', authenticate, authorize('admin'), deletePatient);
router.get('/:id/protocol', authenticate, getPatientProtocol);
router.post('/protocols', authenticate, authorize('admin', 'doctor'), createProtocol);
router.put('/protocols/steps/:stepId', authenticate, updateProtocolStep);

module.exports = router;
