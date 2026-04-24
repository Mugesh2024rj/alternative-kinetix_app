const router = require('express').Router();
const { getReports, generateReport, scheduleReport, getReportData } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getReports);
router.get('/data', authenticate, getReportData);
router.post('/generate', authenticate, generateReport);
router.post('/schedule', authenticate, authorize('admin'), scheduleReport);

module.exports = router;
