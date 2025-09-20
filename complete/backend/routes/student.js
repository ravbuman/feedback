const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Student routes (no authentication required)
router.get('/feedback-form/:formId', studentController.getFeedbackForm);
router.get('/courses', studentController.getCourses);
router.get('/subjects/:courseId/:year/:semester', studentController.getSubjectsByCourse);
router.post('/submit-responses', [
  body('formId').isMongoId().withMessage('Valid form ID is required'),
  body('studentInfo.name').trim().notEmpty().withMessage('Student name is required'),
  body('studentInfo.rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('courseInfo.course').isMongoId().withMessage('Valid course ID is required'),
  body('courseInfo.year').isInt({ min: 1, max: 4 }).withMessage('Valid year is required'),
  body('courseInfo.semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  body('responses').isArray({ min: 1 }).withMessage('At least one response is required'),
  body('responses.*.subject').isMongoId().withMessage('Valid subject ID is required for each response'),
  body('responses.*.form').isMongoId().withMessage('Valid form ID is required for each response'),
  body('responses.*.answersWithQuestions').optional().isArray().withMessage('Answers with questions must be an array'),
  body('responses.*.answersWithQuestions.*.questionId').optional().isMongoId().withMessage('Valid question ID is required'),
  body('responses.*.answersWithQuestions.*.questionText').optional().isString().withMessage('Question text is required'),
  body('responses.*.answersWithQuestions.*.questionType').optional().isIn(['text', 'scale', 'yesno', 'multiplechoice', 'textarea']).withMessage('Valid question type is required'),
  body('responses.*.answersWithQuestions.*.answer').optional().notEmpty().withMessage('Answer is required'),
  body('responses.*.answers').optional().isArray().withMessage('Answers must be an array'),
  // Custom validation to ensure at least one answer format is present
  body('responses.*').custom((value) => {
    if (!value.answersWithQuestions && !value.answers) {
      throw new Error('Either answers or answersWithQuestions must be provided');
    }
    return true;
  })
], studentController.submitResponses);

module.exports = router;