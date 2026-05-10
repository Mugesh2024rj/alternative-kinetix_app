const router = require('express').Router();
const {
  getAnalytics,
  getAppointmentTrends,
  getAssessmentStatusPie,
  getDoctorWorkload,
  getEventsCompleted,
  getCompletedAppointmentsTrend,
  getDoctorParticipation,
  getDoctorPerformanceGrowth,
  getEventParticipationPie
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/metrics',                    authenticate, getAnalytics);
router.get('/appointment-trends',         authenticate, getAppointmentTrends);
router.get('/assessment-status',          authenticate, getAssessmentStatusPie);
router.get('/doctor-workload',            authenticate, getDoctorWorkload);
router.get('/events-completed',           authenticate, getEventsCompleted);
router.get('/completed-appointments-trend', authenticate, getCompletedAppointmentsTrend);
router.get('/doctor-participation',       authenticate, getDoctorParticipation);
router.get('/performance-growth',         authenticate, getDoctorPerformanceGrowth);
router.get('/event-participation-pie',    authenticate, getEventParticipationPie);

module.exports = router;
