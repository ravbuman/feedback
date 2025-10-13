const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Admin Authentication
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], adminController.login);

// Verify token endpoint
router.get('/verify-token', auth, adminController.verifyToken);

// Faculty Management
router.get('/faculty', auth, adminController.getAllFaculty);
router.post('/faculty', [
  auth,
  body('name').trim().notEmpty(),
  body('phoneNumber').trim().notEmpty(),
  body('designation').trim().notEmpty(),
  body('department').trim().notEmpty()
], adminController.createFaculty);
router.post('/faculty/bulk-upload', auth, adminController.bulkUploadFaculty);
router.put('/faculty/:id', [
  auth,
  body('name').optional().trim().notEmpty(),
  body('phoneNumber').optional().trim().notEmpty(),
  body('designation').optional().trim().notEmpty(),
  body('department').optional().trim().notEmpty()
], adminController.updateFaculty);
router.delete('/faculty/:id', auth, adminController.deleteFaculty);

// Course Management
router.get('/courses', auth, adminController.getAllCourses);
router.post('/courses', [
  auth,
  body('courseName').trim().notEmpty(),
  body('courseCode').trim().notEmpty().isUppercase()
], adminController.createCourse);
router.put('/courses/:id', [
  auth,
  body('courseName').optional().trim().notEmpty(),
  body('courseCode').optional().trim().notEmpty().isUppercase()
], adminController.updateCourse);
router.delete('/courses/:id', auth, adminController.deleteCourse);

// Subject Management
router.get('/subjects', auth, adminController.getAllSubjects);
router.post('/subjects', [
  auth,
  body('subjectName').trim().notEmpty(),
  body('course').isMongoId(),
  body('year').isInt({ min: 1, max: 4 }),
  body('semester').isInt({ min: 1, max: 2 }),
  body('faculty').optional().isMongoId()
], adminController.createSubject);
router.put('/subjects/:id', [
  auth,
  body('subjectName').optional().trim().notEmpty(),
  body('course').optional().isMongoId(),
  body('year').optional().isInt({ min: 1, max: 4 }),
  body('semester').optional().isInt({ min: 1, max: 2 }),
  body('faculty').optional().isMongoId()
], adminController.updateSubject);
router.delete('/subjects/:id', auth, adminController.deleteSubject);

// Feedback Form Management
router.get('/feedback-forms', auth, adminController.getAllFeedbackForms);
router.post('/feedback-forms', [
  auth,
  body('formName').trim().notEmpty(),
  body('questions').isArray({ min: 1 }),
  body('questions.*.questionText').trim().notEmpty(),
  body('questions.*.questionType').isIn(['text', 'scale', 'yesno', 'multiplechoice', 'textarea'])
], adminController.createFeedbackForm);
router.put('/feedback-forms/:id', [
  auth,
  body('formName').optional().trim().notEmpty(),
  body('questions').optional().isArray({ min: 1 })
], adminController.updateFeedbackForm);
router.delete('/feedback-forms/:id', auth, adminController.deleteFeedbackForm);

// Activate/Deactivate Feedback Form
router.patch('/feedback-forms/:id/activate', auth, adminController.activateFeedbackForm);
router.patch('/feedback-forms/:id/deactivate', auth, adminController.deactivateFeedbackForm);

// Get Form Analytics
router.get('/feedback-forms/:id/analytics', auth, adminController.getFormAnalytics);

module.exports = router;
