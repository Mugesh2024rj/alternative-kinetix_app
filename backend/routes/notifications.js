const router = require('express').Router();
const { getNotifications, markAsRead, markAllAsRead, handleApprovalAction } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markAsRead);
router.put('/:id/action', authenticate, handleApprovalAction);

module.exports = router;
