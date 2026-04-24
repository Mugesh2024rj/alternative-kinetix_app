const router = require('express').Router();
const { getAssessmentMetrics, getAssessments, createAssessment, updateAssessment } = require('../controllers/assessmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/metrics', authenticate, getAssessmentMetrics);
router.get('/', authenticate, getAssessments);
router.post('/', authenticate, authorize('admin', 'doctor'), createAssessment);
router.put('/:id', authenticate, updateAssessment);

module.exports = router;
