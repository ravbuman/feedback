const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Student routes (no authentication required)
router.get('/feedback-form/:formId', studentController.getFeedbackForm);
router.get('/courses', studentController.getCourses);
router.get('/subjects/:courseId/:year/:semester', studentController.getSubjectsByCourse);
router.post('/submit-feedback', [
  body('formId').isMongoId(),
  body('studentInfo.name').notEmpty(),
  body('studentInfo.rollNumber').notEmpty(),
  body('courseInfo.course').isMongoId(),
  body('courseInfo.year').isInt({ min: 1 }),
  body('courseInfo.semester').isInt({ min: 1 }),
  body('subjectResponses').isArray({ min: 1 }),
], studentController.submitFeedback);

module.exports = router;