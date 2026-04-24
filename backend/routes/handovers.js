const router = require('express').Router();
const { getHandoverMetrics, getHandovers, createHandover, updateHandover, getStaffAvailability } = require('../controllers/handoverController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/metrics', authenticate, getHandoverMetrics);
router.get('/staff-availability', authenticate, getStaffAvailability);
router.get('/', authenticate, getHandovers);
router.post('/', authenticate, createHandover);
router.put('/:id', authenticate, updateHandover);

module.exports = router;
