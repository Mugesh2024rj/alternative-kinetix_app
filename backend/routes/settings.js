const router = require('express').Router();
const { getUsers, createUser, updateUser, getClinicSettings, updateClinicSettings, toggle2FA } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/users', authenticate, authorize('admin'), getUsers);
router.post('/users', authenticate, authorize('admin'), createUser);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.get('/clinic', authenticate, getClinicSettings);
router.put('/clinic', authenticate, authorize('admin'), updateClinicSettings);
router.put('/2fa', authenticate, toggle2FA);

module.exports = router;
