const { validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const FeedbackForm = require('../models/FeedbackForm');
const Response = require('../models/Response');
const Course = require('../models/Course');

// Get all active courses (simple list)
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ courseName: 1 });
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all available courses with their years and semesters
const getAllCourses = async (req, res) => {
  try {
    const courses = await Subject.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$course',
          courseName: { $first: '$courseInfo.courseName' },
          courseCode: { $first: '$courseInfo.courseCode' },
          years: { $addToSet: '$year' },
          semesters: { $addToSet: '$semester' }
        }
      },
      {
        $project: {
          _id: 1,
          courseName: 1,
          courseCode: 1,
          years: { $sortArray: { input: '$years', sortBy: 1 } },
          semesters: { $sortArray: { input: '$semesters', sortBy: 1 } }
        }
      },
      { $sort: { courseName: 1 } }
    ]);

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get subjects for a specific course, year, and semester
const getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId, year, semester } = req.params;

    const subjects = await Subject.find({
      course: courseId,
      year: parseInt(year),
      semester: parseInt(semester),
      isActive: true
    })
      .populate('course', 'courseName courseCode')
      .populate('faculty', 'name designation department')
      .sort({ subjectName: 1 });

    if (subjects.length === 0) {
      return res.status(404).json({ message: 'No subjects found for the selected criteria' });
    }

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get feedback form by ID
const getFeedbackForm = async (req, res) => {
  try {
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.formId)) {
      return res.status(400).json({ message: 'Invalid form ID format' });
    }

    const form = await FeedbackForm.findById(req.params.formId);

    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    if (!form.isActive) {
      return res.status(400).json({ message: 'This feedback form is currently inactive. You cannot submit feedback at this time.' });
    }

    // Check if there is a currently active period
    const currentDate = new Date();
    const activePeriod = form.activationPeriods.find(period => {
      const startDate = new Date(period.start);
      const endDate = period.end ? new Date(period.end) : null;
      return startDate <= currentDate && (!endDate || endDate >= currentDate);
    });

    if (!activePeriod) {
      return res.status(400).json({ message: 'This feedback form is not currently in an active period.' });
    }

    // Populate assignedFaculty only if it exists and has values
    let populatedForm = form;
    if (form.assignedFaculty && form.assignedFaculty.length > 0) {
      populatedForm = await FeedbackForm.findById(req.params.formId)
        .populate('assignedFaculty', 'name designation department');
    }

    const formResponse = {
      ...populatedForm.toObject(),
      currentPeriod: activePeriod
    };

    res.json(formResponse);
  } catch (error) {
    console.error('Get feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};







// Get student response status (check if already submitted)
const checkResponseStatus = async (req, res) => {
  try {
    const { rollNumber, course, year, semester } = req.query;

    if (!rollNumber || !course || !year || !semester) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const existingResponse = await Response.findOne({
      rollNumber,
      course,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (existingResponse) {
      return res.json({
        hasSubmitted: true,
        submittedAt: existingResponse.submittedAt,
        responseId: existingResponse._id
      });
    }

    res.json({ hasSubmitted: false });
  } catch (error) {
    console.error('Check response status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit multiple responses (new method for bulk submission)
const submitFeedback = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('[submitFeedback] Validation failed', {
        errors: errors.array(),
        bodyKeys: Object.keys(req.body || {})
      });
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { studentInfo, courseInfo, subjectResponses, formId } = req.body;
    console.log('[submitFeedback] Incoming payload', {
      formId,
      studentRoll: studentInfo?.rollNumber,
      course: courseInfo?.course,
      year: courseInfo?.year,
      semester: courseInfo?.semester,
      subjectsCount: Array.isArray(subjectResponses) ? subjectResponses.length : 0
    });

    // Validate ObjectIds
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(courseInfo.course)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    for (const response of subjectResponses) {
      if (!mongoose.Types.ObjectId.isValid(response.subject)) {
        return res.status(400).json({ message: 'Invalid subject ID' });
      }
      if (!mongoose.Types.ObjectId.isValid(response.form)) {
        return res.status(400).json({ message: 'Invalid form ID in response' });
      }
    }

    // Get the feedback form and check the current period
    const feedbackForm = await FeedbackForm.findById(formId);
    if (!feedbackForm) {
      console.warn('[submitFeedback] Form not found', { formId });
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    // Find the latest active period (choose the one with the most recent start)
    const currentDate = new Date();
    const matchingPeriods = (feedbackForm.activationPeriods || []).filter(period => {
      const startDate = new Date(period.start);
      const endDate = period.end ? new Date(period.end) : null;
      return startDate <= currentDate && (!endDate || endDate >= currentDate);
    });
    const activePeriod = matchingPeriods.length > 0
      ? matchingPeriods.reduce((latest, p) => (new Date(p.start) > new Date(latest.start) ? p : latest))
      : null;

    if (!activePeriod) {
      console.warn('[submitFeedback] No active period', {
        formId,
        isActive: feedbackForm.isActive,
        activationPeriodsCount: feedbackForm.activationPeriods?.length || 0,
        now: currentDate.toISOString(),
      });
      return res.status(400).json({ message: 'This feedback form is not currently in an active period' });
    }

    // Check if student has already submitted feedback for this form in the current period
    const duplicateQuery = {
      'studentInfo.rollNumber': studentInfo.rollNumber,
      'courseInfo.course': courseInfo.course,
      'courseInfo.year': courseInfo.year,
      'courseInfo.semester': courseInfo.semester,
      'period.start': activePeriod.start,
      $or: [
        { 'period.end': { $exists: false } },
        { 'period.end': activePeriod.end }
      ]
    };
    console.log('[submitFeedback] Duplicate check query', {
      ...duplicateQuery,
      'period.start': activePeriod.start?.toISOString?.() || activePeriod.start,
      'period.end': activePeriod.end ? (activePeriod.end?.toISOString?.() || activePeriod.end) : null
    });
    const existingResponse = await Response.findOne(duplicateQuery);

    if (existingResponse) {
      console.warn('[submitFeedback] Duplicate found for current period', {
        responseId: existingResponse._id,
        periodStart: existingResponse.period?.start,
        periodEnd: existingResponse.period?.end,
        formId
      });
      return res.status(400).json({ message: 'Feedback already submitted for this course, year, and semester' });
    }

    // Get the feedback form to include question details
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    // Create single response document with all subjects and question details
    const responseDoc = {
      studentInfo: {
        name: studentInfo.name,
        phoneNumber: studentInfo.phoneNumber || '',
        rollNumber: studentInfo.rollNumber
      },
      courseInfo: {
        course: courseInfo.course,
        year: courseInfo.year,
        semester: courseInfo.semester
      },
      period: {
        start: activePeriod.start,
        end: activePeriod.end
      },
      subjectResponses: subjectResponses.map(response => {
        // If the frontend sends answersWithQuestions, use that structure
        if (response.answersWithQuestions) {
          return {
            subject: response.subject,
            form: response.form,
            questions: response.answersWithQuestions.map(qa => ({
              questionId: qa.questionId,
              questionText: qa.questionText,
              questionType: qa.questionType,
              options: qa.options || [],
              isRequired: qa.isRequired,
              scaleMin: qa.scaleMin,
              scaleMax: qa.scaleMax
            })),
            answers: response.answersWithQuestions.map(qa => qa.answer)
          };
        } else {
          // Fallback to old structure (for backward compatibility)
          return {
            subject: response.subject,
            form: response.form,
            questions: form.questions.map(question => ({
              questionId: question._id,
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options || [],
              isRequired: question.isRequired,
              scaleMin: question.scaleMin,
              scaleMax: question.scaleMax
            })),
            answers: response.answers
          };
        }
      })
    };

    const savedResponse = await Response.create(responseDoc);

    // Populate the response for better return data
    await savedResponse.populate([
      { path: 'courseInfo.course', select: 'courseName courseCode' },
      { path: 'subjectResponses.subject', select: 'subjectName' },
      { path: 'subjectResponses.form', select: 'formName' }
    ]);

    console.log('[submitFeedback] Submission saved', { responseId: savedResponse._id, formId });
    res.status(201).json({
      message: 'Responses submitted successfully',
      response: savedResponse
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
    }
    console.error('[submitFeedback] Server error', { message: error.message, name: error.name, stack: error.stack });
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

module.exports = {
  getCourses,
  getAllCourses,
  getSubjectsByCourse,
  getFeedbackForm,
  submitFeedback,
  checkResponseStatus
};
