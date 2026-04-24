const router = require('express').Router();
const { login, logout, getMe, getSessions, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/sessions', authenticate, getSessions);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
