const router = require('express').Router();
const { getDoctorMetrics, getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, getHouseVisitMetrics, getHouseVisits, submitHouseVisit, approveHouseVisit } = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/metrics', authenticate, getDoctorMetrics);
router.get('/', authenticate, getDoctors);
router.get('/:id', authenticate, getDoctorById);
router.post('/', authenticate, authorize('admin'), createDoctor);
router.put('/:id', authenticate, authorize('admin'), updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);
router.get('/house-visits/metrics', authenticate, getHouseVisitMetrics);
router.get('/house-visits/list', authenticate, getHouseVisits);
router.post('/house-visits/submit', authenticate, submitHouseVisit);
router.put('/house-visits/:id/approve', authenticate, authorize('admin'), approveHouseVisit);

module.exports = router;
