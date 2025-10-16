const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const FeedbackForm = require('../models/FeedbackForm');
const Response = require('../models/Response');

// Admin Authentication
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const admin = await Admin.findOne({ email, isActive: true });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { id: admin._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '24h'
    });

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (auth middleware already verified it)
    res.json({
      id: req.admin._id,
      email: req.admin.email
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Faculty Management
const getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ isActive: true })
      .populate('subjects', 'subjectName course year semester')
      .sort({ createdAt: -1 });
    res.json(faculty);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createFaculty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const faculty = new Faculty(req.body);
    await faculty.save();
    res.status(201).json(faculty);
  } catch (error) {
    console.error('Create faculty error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Phone number already exists. Please use a different phone number.'
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json(faculty);
  } catch (error) {
    console.error('Update faculty error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Phone number already exists. Please use a different phone number.'
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Remove faculty assignment from all subjects
    const Subject = require('../models/Subject');
    await Subject.updateMany(
      { faculty: req.params.id },
      { $unset: { faculty: 1 } }
    );

    // Delete all responses that reference this faculty
    const Response = require('../models/Response');
    await Response.deleteMany({ 'subjectResponses.faculty': req.params.id });

    // Permanently delete the faculty
    await Faculty.findByIdAndDelete(req.params.id);

    res.json({ message: 'Faculty and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Course Management
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course code already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course code already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deactivated successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Subject Management
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .populate('course', 'courseName courseCode')
      .populate('faculty', 'name designation department')
      .sort({ course: 1, year: 1, semester: 1 });

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subject = new Subject(req.body);
    await subject.save();

    // Add subject to faculty's subjects array only if faculty is provided
    if (req.body.faculty) {
      await Faculty.findByIdAndUpdate(
        req.body.faculty,
        { $addToSet: { subjects: subject._id } }
      );
    }

    await subject.populate('course', 'courseName courseCode');
    if (subject.faculty) {
      await subject.populate('faculty', 'name designation department');
    }

    res.status(201).json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists for this course, year, and semester' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const oldSubject = await Subject.findById(req.params.id);
    if (!oldSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('course', 'courseName courseCode');

    if (subject.faculty) {
      await subject.populate('faculty', 'name designation department');
    }

    // Handle faculty assignment changes
    const oldFacultyId = oldSubject.faculty ? oldSubject.faculty.toString() : null;
    const newFacultyId = req.body.faculty || null;

    if (oldFacultyId !== newFacultyId) {
      // Remove from old faculty if it existed
      if (oldFacultyId) {
        await Faculty.findByIdAndUpdate(
          oldFacultyId,
          { $pull: { subjects: subject._id } }
        );
      }

      // Add to new faculty if provided
      if (newFacultyId) {
        await Faculty.findByIdAndUpdate(
          newFacultyId,
          { $addToSet: { subjects: subject._id } }
        );
      }
    }

    res.json(subject);
  } catch (error) {
    console.error('Update subject error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists for this course, year, and semester' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Remove from faculty's subjects array only if faculty was assigned
    if (subject.faculty) {
      await Faculty.findByIdAndUpdate(
        subject.faculty,
        { $pull: { subjects: subject._id } }
      );
    }

    // Delete all responses that reference this subject
    const Response = require('../models/Response');
    await Response.deleteMany({ 'subjectResponses.subject': req.params.id });

    // Permanently delete the subject
    await Subject.findByIdAndDelete(req.params.id);

    res.json({ message: 'Subject and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Feedback Form Management
const getAllFeedbackForms = async (req, res) => {
  try {
    const forms = await FeedbackForm.find({}).sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    console.error('Get feedback forms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createFeedbackForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const form = new FeedbackForm(req.body);
    await form.save();
    res.status(201).json(form);
  } catch (error) {
    console.error('Create feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFeedbackForm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Apply the update directly (activation periods managed via activate/deactivate endpoints)
    const form = await FeedbackForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(form);
  } catch (error) {
    console.error('Update feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFeedbackForm = async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    // Delete all responses that reference this form
    const Response = require('../models/Response');
    await Response.deleteMany({ 'subjectResponses.form': req.params.id });

    // Delete the feedback form itself
    await FeedbackForm.findByIdAndDelete(req.params.id);

    res.json({ message: 'Feedback form and all related data deleted successfully' });
  } catch (error) {
    console.error('Delete feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Activate a feedback form
const activateFeedbackForm = async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    if (form.isActive) {
      return res.status(400).json({ message: 'Form is already active' });
    }

    form.isActive = true;
    form.activationPeriods.push({ start: new Date() });

    await form.save();
    res.json(form);
  } catch (error) {
    console.error('Activate feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deactivate a feedback form
const deactivateFeedbackForm = async (req, res) => {
  try {
    const form = await FeedbackForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    if (!form.isActive) {
      return res.status(400).json({ message: 'Form is already deactivated' });
    }

    form.isActive = false;
    const lastActivation = form.activationPeriods[form.activationPeriods.length - 1];
    if (lastActivation && !lastActivation.end) {
      lastActivation.end = new Date();
    }

    await form.save();
    res.json(form);
  } catch (error) {
    console.error('Deactivate feedback form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFormAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await FeedbackForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }

    const responses = await Response.find({ form: id });

    const totalResponses = responses.length;

    const questionAnalytics = form.questions.map(question => {
      const questionId = question._id.toString();
      const relevantAnswers = responses.map(r => r.answers.find(a => a.question.toString() === questionId)).filter(Boolean);

      switch (question.questionType) {
        case 'multiple-choice': {
          const optionCounts = question.options.reduce((acc, option) => {
            acc[option] = 0;
            return acc;
          }, {});
          relevantAnswers.forEach(answer => {
            if (answer.answer in optionCounts) {
              optionCounts[answer.answer]++;
            }
          });
          return {
            questionText: question.questionText,
            type: 'multiple-choice',
            data: Object.entries(optionCounts).map(([option, count]) => ({ option, count })),
          };
        }
        case 'rating': {
          const ratings = relevantAnswers.map(a => parseInt(a.answer, 10)).filter(n => !isNaN(n));
          const average = ratings.length > 0 ? ratings.reduce((sum, val) => sum + val, 0) / ratings.length : 0;
          return {
            questionText: question.questionText,
            type: 'rating',
            average,
            count: ratings.length,
          };
        }
        case 'open-ended': {
          const answers = relevantAnswers.map(a => a.answer).filter(Boolean);
          return {
            questionText: question.questionText,
            type: 'open-ended',
            answers,
          };
        }
        default:
          return {
            questionText: question.questionText,
            type: question.questionType,
            data: [],
          };
      }
    });

    res.json({
      totalResponses,
      questionAnalytics,
    });

  } catch (error) {
    console.error('Get form analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  login,
  verifyToken,
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getAllFeedbackForms,
  createFeedbackForm,
  updateFeedbackForm,
  deleteFeedbackForm,
  activateFeedbackForm,
  deactivateFeedbackForm,
  getFormAnalytics,
  // Added below
  bulkUploadFaculty: async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'No items provided' });
      }

      // Fetch once to map courseName -> _id
      const courses = await Course.find({ isActive: true });
      const courseByName = new Map(courses.map(c => [c.courseName.toLowerCase(), c]));

      const results = [];
      for (const item of items) {
        const name = item.name?.trim();
        const phoneNumber = item.phoneNumber?.trim();
        const designation = item.designation?.trim();
        const department = item.department?.trim();
        const subjectInfo = item.subject || {};

        if (!name || !phoneNumber || !designation || !department) {
          results.push({ phoneNumber, status: 'skipped', reason: 'Missing required fields' });
          continue;
        }

        // Upsert faculty by phoneNumber
        let faculty = await Faculty.findOneAndUpdate(
          { phoneNumber },
          { name, designation, department, isActive: true },
          { new: true }
        );
        if (!faculty) {
          faculty = await Faculty.create({ name, phoneNumber, designation, department });
        }

        // Subject handling
        const courseName = (subjectInfo.courseName || department || '').toString();
        const course = courseByName.get(courseName.toLowerCase());
        if (!course) {
          results.push({ phoneNumber, status: 'partial', reason: `Course not found: ${courseName}` });
          continue;
        }

        const year = parseInt(subjectInfo.year, 10);
        const semesterParsed = parseInt(subjectInfo.semester, 10);
        const semester = !isNaN(semesterParsed) && semesterParsed >= 1 && semesterParsed <= 2 ? semesterParsed : null;
        if (!subjectInfo.name || !year || !semester) {
          // Skip subject creation/assignment if info insufficient; faculty was upserted already
          results.push({ phoneNumber, status: 'ok', facultyId: faculty._id, note: 'Subject skipped due to incomplete year/semester/name' });
          continue;
        }

        // Find existing subject
        let subject = await Subject.findOne({
          course: course._id,
          year,
          semester,
          subjectName: subjectInfo.name,
          isActive: true,
        });

        if (!subject) {
          subject = await Subject.create({
            subjectName: subjectInfo.name,
            course: course._id,
            year,
            semester,
            faculty: faculty._id,
          });
        } else {
          // Assign to faculty if not already
          subject.faculty = faculty._id;
          await subject.save();
        }

        // Ensure faculty.subjects contains subject
        await Faculty.findByIdAndUpdate(faculty._id, { $addToSet: { subjects: subject._id } });

        results.push({ phoneNumber, status: 'ok', facultyId: faculty._id, subjectId: subject._id });
      }

      res.json({ results });
    } catch (error) {
      console.error('Bulk upload faculty error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
