const router = require('express').Router();
const { getDashboardMetrics, getTodaySchedule, getRecentActivity, getCalendarEvents } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/metrics', authenticate, getDashboardMetrics);
router.get('/schedule', authenticate, getTodaySchedule);
router.get('/activity', authenticate, getRecentActivity);
router.get('/calendar', authenticate, getCalendarEvents);

module.exports = router;
