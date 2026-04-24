const router = require('express').Router();
const { getAnalytics, getAppointmentTrends, getAssessmentStatusPie, getDoctorWorkload } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/metrics', authenticate, getAnalytics);
router.get('/appointment-trends', authenticate, getAppointmentTrends);
router.get('/assessment-status', authenticate, getAssessmentStatusPie);
router.get('/doctor-workload', authenticate, getDoctorWorkload);

module.exports = router;
