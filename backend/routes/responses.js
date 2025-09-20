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

// Get response statistics
router.get('/stats/overview', auth, responseController.getResponseStats);

// Get faculty performance analysis
router.get('/stats/faculty-performance', auth, responseController.getFacultyPerformance);

// Export responses to CSV
router.get('/export/csv', auth, responseController.exportToCSV);

// Delete response (admin only)
router.delete('/:id', auth, responseController.deleteResponse);

module.exports = router;
