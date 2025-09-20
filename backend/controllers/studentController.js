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
    const form = await FeedbackForm.findById(req.params.formId);
    
    if (!form || !form.isActive) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Get feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit feedback response
const submitFeedback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      studentName,
      phoneNumber,
      rollNumber,
      course,
      year,
      semester,
      feedbackForm,
      subjectResponses
    } = req.body;

    // Verify that the feedback form exists and is active
    const form = await FeedbackForm.findById(feedbackForm);
    if (!form || !form.isActive) {
      return res.status(404).json({ message: 'Feedback form not found or inactive' });
    }

    // Verify that all subjects exist and are active
    const subjectIds = subjectResponses.map(sr => sr.subject);
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      course,
      year,
      semester,
      isActive: true
    });

    if (subjects.length !== subjectIds.length) {
      return res.status(400).json({ message: 'One or more subjects not found or inactive' });
    }

    // Check if student has already submitted feedback for this course/year/semester
    const existingResponse = await Response.findOne({
      rollNumber,
      course,
      year,
      semester
    });

    if (existingResponse) {
      return res.status(400).json({ message: 'Feedback already submitted for this course, year, and semester' });
    }

    // Validate that all required questions are answered
    const formQuestions = form.questions.filter(q => q.isRequired);
    for (const subjectResponse of subjectResponses) {
      if (subjectResponse.answers.length !== form.questions.length) {
        return res.status(400).json({ 
          message: `Incomplete answers for subject ${subjectResponse.subject}. All questions must be answered.` 
        });
      }
    }

    // Create the response
    const response = new Response({
      studentName,
      phoneNumber,
      rollNumber,
      course,
      year,
      semester,
      feedbackForm,
      subjectResponses
    });

    await response.save();
    
    // Populate the response with related data
    await response.populate([
      { path: 'course', select: 'courseName courseCode' },
      { path: 'subjectResponses.subject', select: 'subjectName' },
      { path: 'subjectResponses.faculty', select: 'name designation department' }
    ]);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      responseId: response._id,
      studentName: response.studentName,
      course: response.course.courseName,
      year: response.year,
      semester: response.semester,
      subjectsCount: response.subjectResponses.length
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
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
const submitResponses = async (req, res) => {
  try {
    console.log('=== SUBMIT RESPONSES DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('=== VALIDATION ERRORS ===');
      console.log('Validation failed:', errors.array());
      console.log('Request body structure:', Object.keys(req.body));
      console.log('Responses structure:', req.body.responses?.map(r => Object.keys(r)));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }
    
    const { studentInfo, courseInfo, responses, formId } = req.body;

    console.log('All validations passed');
    console.log('FormId:', formId);
    console.log('Responses count:', responses.length);
    
    // Validate ObjectIds
    console.log('Validating ObjectIds...');
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(formId)) {
      console.log('Invalid formId:', formId);
      return res.status(400).json({ message: 'Invalid form ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(courseInfo.course)) {
      console.log('Invalid course ID:', courseInfo.course);
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    for (const response of responses) {
      if (!mongoose.Types.ObjectId.isValid(response.subject)) {
        console.log('Invalid subject ID:', response.subject);
        return res.status(400).json({ message: 'Invalid subject ID' });
      }
      if (!mongoose.Types.ObjectId.isValid(response.form)) {
        console.log('Invalid form ID in response:', response.form);
        return res.status(400).json({ message: 'Invalid form ID in response' });
      }
    }
    console.log('All ObjectIds are valid');

    // Check if student has already submitted feedback for this course/year/semester
    console.log('Checking for existing response...');
    const existingResponse = await Response.findOne({
      'studentInfo.rollNumber': studentInfo.rollNumber,
      'courseInfo.course': courseInfo.course,
      'courseInfo.year': courseInfo.year,
      'courseInfo.semester': courseInfo.semester
    });

    if (existingResponse) {
      console.log('Existing response found:', existingResponse._id);
      return res.status(400).json({ message: 'Feedback already submitted for this course, year, and semester' });
    }
    console.log('No existing response found, proceeding...');

    // Get the feedback form to include question details
    console.log('Fetching form with ID:', formId);
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      console.log('Form not found for ID:', formId);
      return res.status(404).json({ message: 'Feedback form not found' });
    }
    
    console.log('Form found:', form.formName);
    console.log('Form questions count:', form.questions.length);

    // Create single response document with all subjects and question details
    console.log('Creating response document...');
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
      subjectResponses: responses.map(response => {
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

    console.log('Response document created, attempting to save...');
    console.log('Response doc structure:', JSON.stringify(responseDoc, null, 2));
    
    console.log('Attempting to save to database...');
    const savedResponse = await Response.create(responseDoc);
    console.log('Response saved successfully with ID:', savedResponse._id);
    
    // Populate the response for better return data
    console.log('Populating response with related data...');
    await savedResponse.populate([
      { path: 'courseInfo.course', select: 'courseName courseCode' },
      { path: 'subjectResponses.subject', select: 'subjectName' },
      { path: 'subjectResponses.form', select: 'formName' }
    ]);
    console.log('Response populated successfully');

    console.log('Sending success response...');
    res.status(201).json({
      message: 'Responses submitted successfully',
      response: savedResponse
    });
  } catch (error) {
    console.error('=== SUBMIT RESPONSES ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
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
  submitResponses,
  checkResponseStatus
};
