const express = require('express');
const auth = require('../middleware/auth');
const responseController = require('../controllers/responseController');

const router = express.Router();

// Get all responses with filtering options
router.get('/', auth, responseController.getAllResponses);

// Get response by ID
router.get('/:id', auth, responseController.getResponseById);

// Get question analytics for specific form
router.get('/analytics/questions', auth, responseController.getQuestionAnalytics);

// Get faculty question analytics for specific form
router.get('/analytics/faculty-questions', auth, responseController.getFacultyQuestionAnalytics);

// Get response statistics
router.get('/stats/overview', auth, responseController.getResponseStats);

// Get faculty performance analysis
router.get('/stats/faculty-performance', auth, responseController.getFacultyPerformance);

// Get raw text answers per question grouped by faculty (with optional facultyId and pagination)
router.get('/analytics/text-answers', auth, responseController.getTextAnswersByFaculty);

// Export raw text answers CSV
router.get('/analytics/text-answers/export', auth, responseController.exportTextAnswersCSV);

// Export responses to CSV
router.get('/export/csv', auth, responseController.exportToCSV);

// Delete response (admin only)
router.delete('/:id', auth, responseController.deleteResponse);

module.exports = router;
