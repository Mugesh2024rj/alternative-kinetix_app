const router = require('express').Router();
const { getEvents, getEventById, createEvent, updateEvent, assignToEvent } = require('../controllers/eventController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getEvents);
router.get('/:id', authenticate, getEventById);
router.post('/', authenticate, authorize('admin'), createEvent);
router.put('/:id', authenticate, authorize('admin'), updateEvent);
router.post('/:id/assign', authenticate, authorize('admin'), assignToEvent);

module.exports = router;
