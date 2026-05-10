const router = require('express').Router();
const { getPerformanceMetrics, getAppointmentTypeBreakdown, getPatientSatisfaction, getDoctorPerformanceIndex, getSessionTrends, getCompletedAppointmentsChart, recalculateAllDoctorPoints } = require('../controllers/performanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/metrics', authenticate, getPerformanceMetrics);
router.get('/appointment-types', authenticate, getAppointmentTypeBreakdown);
router.get('/satisfaction', authenticate, getPatientSatisfaction);
router.get('/doctor-index', authenticate, getDoctorPerformanceIndex);
router.get('/session-trends', authenticate, getSessionTrends);
router.get('/completed-appointments', authenticate, getCompletedAppointmentsChart);
router.post('/recalculate-all', authenticate, authorize('admin'), recalculateAllDoctorPoints);

module.exports = router;
