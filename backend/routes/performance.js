const router = require('express').Router();
const { getPerformanceMetrics, getAppointmentTypeBreakdown, getPatientSatisfaction, getDoctorPerformanceIndex, getSessionTrends } = require('../controllers/performanceController');
const { authenticate } = require('../middleware/auth');

router.get('/metrics', authenticate, getPerformanceMetrics);
router.get('/appointment-types', authenticate, getAppointmentTypeBreakdown);
router.get('/satisfaction', authenticate, getPatientSatisfaction);
router.get('/doctor-index', authenticate, getDoctorPerformanceIndex);
router.get('/session-trends', authenticate, getSessionTrends);

module.exports = router;
