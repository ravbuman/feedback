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
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find all subjects related to this course
    const subjectsToDelete = await Subject.find({ course: courseId });
    const subjectIdsToDelete = subjectsToDelete.map(s => s._id);

    // Delete all responses for those subjects
    await Response.deleteMany({ 'subjectResponses.subject': { $in: subjectIdsToDelete } });
    // Delete the subjects themselves
    await Subject.deleteMany({ course: courseId });
    // Finally, delete the course
    await Course.findByIdAndDelete(courseId);

    res.json({ message: 'Course and all related subjects and responses deleted successfully' });
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
      .populate('sectionFaculty.faculty', 'name designation department')
      .populate('sectionFaculty.section')
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

    // Handle section-specific faculty assignments
    if (req.body.sectionFaculty && Array.isArray(req.body.sectionFaculty)) {
      // Add subject to each faculty's subjects array
      const facultyIds = [...new Set(req.body.sectionFaculty.map(sf => sf.faculty))];
      for (const facultyId of facultyIds) {
        await Faculty.findByIdAndUpdate(
          facultyId,
          { $addToSet: { subjects: subject._id } }
        );
      }
    }

    // Add subject to default faculty's subjects array if provided
    if (req.body.faculty) {
      await Faculty.findByIdAndUpdate(
        req.body.faculty,
        { $addToSet: { subjects: subject._id } }
      );
    }

    await subject.populate('course', 'courseName courseCode');
    await subject.populate('sectionFaculty.faculty', 'name designation department');
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

    await subject.populate('sectionFaculty.faculty', 'name designation department');
    if (subject.faculty) {
      await subject.populate('faculty', 'name designation department');
    }

    // Handle section-specific faculty assignment changes
    const oldSectionFacultyIds = oldSubject.sectionFaculty ? 
      [...new Set(oldSubject.sectionFaculty.map(sf => sf.faculty.toString()))] : [];
    const newSectionFacultyIds = req.body.sectionFaculty ? 
      [...new Set(req.body.sectionFaculty.map(sf => sf.faculty))] : [];

    // Remove subject from faculties no longer assigned
    const removedFacultyIds = oldSectionFacultyIds.filter(id => !newSectionFacultyIds.includes(id));
    for (const facultyId of removedFacultyIds) {
      await Faculty.findByIdAndUpdate(
        facultyId,
        { $pull: { subjects: subject._id } }
      );
    }

    // Add subject to newly assigned faculties
    const addedFacultyIds = newSectionFacultyIds.filter(id => !oldSectionFacultyIds.includes(id));
    for (const facultyId of addedFacultyIds) {
      await Faculty.findByIdAndUpdate(
        facultyId,
        { $addToSet: { subjects: subject._id } }
      );
    }

    // Handle default faculty assignment changes
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

      // Fetch courses once
      const courses = await Course.find({ isActive: true });
      const courseMap = new Map();
      courses.forEach(c => { 
        courseMap.set(c.courseName.toLowerCase(), c); 
        courseMap.set(c.courseCode.toLowerCase(), c); 
      });

      const results = [];
      const facultyCache = new Map(); // Cache faculty by phone/name
      const subjectGroups = new Map(); // Group rows by subject

      // Phase 1: Process all rows and group by subject
      for (const item of items) {
        const name = item.name?.trim();
        const phoneNumber = item.phoneNumber?.trim() || null;
        const designation = item.designation?.trim();
        const department = item.department?.trim();
        const subjectInfo = item.subject || {};
        const sectionName = subjectInfo.section?.trim() || null;
        const isLab = subjectInfo.isLab === true || subjectInfo.isLab === 'true';

        if (!name || !designation || !department) {
          results.push({ name, phoneNumber, status: 'skipped', reason: 'Missing required fields' });
          continue;
        }

        // Find or create faculty
        const facultyKey = phoneNumber || `${name}_${department}`;
        let faculty = facultyCache.get(facultyKey);
        
        if (!faculty) {
          if (phoneNumber) {
            faculty = await Faculty.findOne({ phoneNumber });
          } else {
            faculty = await Faculty.findOne({ name, department });
          }

          if (!faculty) {
            faculty = await Faculty.create({ name, phoneNumber, designation, department, isActive: true });
          } else {
            faculty.name = name;
            faculty.designation = designation;
            faculty.department = department;
            faculty.isActive = true;
            if (phoneNumber) faculty.phoneNumber = phoneNumber;
            await faculty.save();
          }
          
          facultyCache.set(facultyKey, faculty);
        }

        // Validate subject info
        const courseName = (subjectInfo.courseName || department || '').toString();
        console.log(`[Bulk Upload Debug] Row for ${name}: courseName="${courseName}", department="${department}", subjectInfo.courseName="${subjectInfo.courseName}"`);
        const course = courseMap.get(courseName.toLowerCase());
        if (!course) {
          console.log(`[Bulk Upload Error] Course not found for: "${courseName}". Available courses:`, Array.from(courseMap.keys()));
          results.push({ name, phoneNumber, status: 'error', reason: `Course not found: ${courseName}` });
          continue;
        }
        console.log(`[Bulk Upload Success] Matched course: ${course.courseName} (${course.courseCode})`);


        const year = parseInt(subjectInfo.year, 10);
        const semester = parseInt(subjectInfo.semester, 10);

        if (!subjectInfo.name || !year || isNaN(semester)) {
          results.push({ name, phoneNumber, status: 'ok', facultyId: faculty._id, note: 'Subject skipped due to incomplete info' });
          continue;
        }

        // Group by subject
        const subjectKey = `${course._id}_${year}_${semester}_${subjectInfo.name}`;
        if (!subjectGroups.has(subjectKey)) {
          subjectGroups.set(subjectKey, {
            subjectName: subjectInfo.name,
            course: course,
            year,
            semester,
            sectionFacultyMap: new Map(),
            defaultFaculty: null,
            isLab: isLab
          });
        }

        const group = subjectGroups.get(subjectKey);
        
        // Update isLab if any row specifies it as lab
        if (isLab) {
          group.isLab = true;
        }
        
        if (sectionName) {
          // Section-specific assignment
          group.sectionFacultyMap.set(sectionName, faculty);
        } else {
          // Default faculty (for sectionless)
          group.defaultFaculty = faculty;
        }
      }

      // Phase 2: Process grouped subjects
      let yearSemestersCreated = [];
      
      for (const [subjectKey, group] of subjectGroups) {
        try {
          let { subjectName, course, year, semester, sectionFacultyMap, defaultFaculty, isLab } = group;

          // Find or create year-semester in course
          let yearSemData = course.yearSemesterSections?.find(
            ys => ys.year === year && ys.semester === semester
          );

          if (!yearSemData) {
            // Auto-create year-semester combination
            console.log(`[Bulk Upload] Auto-creating Year ${year} Semester ${semester} for ${course.courseName}`);
            
            if (!course.yearSemesterSections) {
              course.yearSemesterSections = [];
            }
            
            course.yearSemesterSections.push({
              year: year,
              semester: semester,
              sections: [] // Start with empty sections, will be populated below
            });
            
            await course.save();
            
            // Reload course to get the newly created year-semester with proper _id
            course = await Course.findById(course._id);
            yearSemData = course.yearSemesterSections.find(
              ys => ys.year === year && ys.semester === semester
            );
            
            yearSemestersCreated.push(`${course.courseName} - Year ${year} Sem ${semester}`);
            console.log(`[Bulk Upload] Created Year ${year} Semester ${semester} for ${course.courseName}`);
          }

          // Process sections - auto-create if needed
          console.log(`[Bulk Upload] Processing sections for ${subjectName} (${course.courseName} Y${year} S${semester})`);
          console.log(`[Bulk Upload] Existing sections:`, yearSemData.sections.map(s => s.sectionName));
          console.log(`[Bulk Upload] Required sections from CSV:`, Array.from(sectionFacultyMap.keys()));
          
          let sectionsCreated = [];
          let courseModified = false;

          for (const [sectionName, faculty] of sectionFacultyMap) {
            // Check if section exists
            let section = yearSemData.sections.find(s => s.sectionName === sectionName);
            
            if (!section) {
              // Auto-create section
              console.log(`[Bulk Upload] ➕ Auto-creating section "${sectionName}" for ${course.courseName} Year ${year} Sem ${semester}`);
              yearSemData.sections.push({ sectionName });
              courseModified = true;
              sectionsCreated.push(sectionName);
            } else {
              console.log(`[Bulk Upload] ✓ Section "${sectionName}" already exists`);
            }
          }

          // Save course if sections were created
          if (courseModified) {
            await course.save();
            console.log(`[Bulk Upload] 💾 Saved course with new sections:`, sectionsCreated);
          } else {
            console.log(`[Bulk Upload] ℹ️ No new sections needed`);
          }
          
          // ALWAYS reload course to get proper section _ids (whether newly created or existing)
          const reloadedCourse = await Course.findById(course._id);
          const reloadedYearSem = reloadedCourse.yearSemesterSections.find(
            ys => ys.year === year && ys.semester === semester
          );
          
          // Build sectionFacultyArray with proper section _ids from reloaded course
          const sectionFacultyArray = [];
          console.log(`[Bulk Upload] Building section-faculty mappings for ${subjectName}:`);
          console.log(`[Bulk Upload] sectionFacultyMap has ${sectionFacultyMap.size} entries:`, Array.from(sectionFacultyMap.entries()).map(([sec, fac]) => ({ section: sec, faculty: fac.name })));
          
          for (const [sectionName, faculty] of sectionFacultyMap) {
            const section = reloadedYearSem.sections.find(s => s.sectionName === sectionName);
            if (section) {
              sectionFacultyArray.push({
                section: section._id,
                faculty: faculty._id
              });
              console.log(`[Bulk Upload] ✓ Mapped section "${sectionName}" (${section._id}) to faculty ${faculty.name} (${faculty._id})`);
            } else {
              console.error(`[Bulk Upload Error] ✗ Section "${sectionName}" not found after reload!`);
            }
          }
          
          console.log(`[Bulk Upload] Final Section-Faculty array for ${subjectName}:`, sectionFacultyArray.map(sf => ({ section: sf.section.toString(), faculty: sf.faculty.toString() })));

          // Find or create subject
          let subject = await Subject.findOne({
            course: course._id,
            year,
            semester,
            subjectName,
            isActive: true,
          });

          if (!subject) {
            // Create new subject
            const subjectData = {
              subjectName,
              subjectCode: subjectName.split(' ').map(w => w[0]).join('').toUpperCase(),
              course: course._id,
              year,
              semester,
              isLab: isLab || false,
              isActive: true
            };

            if (sectionFacultyArray.length > 0) {
              subjectData.sectionFaculty = sectionFacultyArray;
            } else if (defaultFaculty) {
              subjectData.faculty = defaultFaculty._id;
            }

            subject = await Subject.create(subjectData);
            console.log(`[Bulk Upload] Created subject: ${subjectName} for ${course.courseName} (${course.courseCode}) Year ${year} Sem ${semester}`);
            if (sectionFacultyArray.length > 0) {
              console.log(`[Bulk Upload] With section-faculty assignments:`, sectionFacultyArray.length);
            }
          } else {
            console.log(`[Bulk Upload] Updating existing subject: ${subjectName}`);
            // Update existing subject
            if (sectionFacultyArray.length > 0) {
              // Merge with existing sectionFaculty
              const existingMap = new Map(
                subject.sectionFaculty.map(sf => [sf.section.toString(), sf.faculty.toString()])
              );
              
              sectionFacultyArray.forEach(sf => {
                existingMap.set(sf.section.toString(), sf.faculty.toString());
              });
              
              subject.sectionFaculty = Array.from(existingMap.entries()).map(([section, faculty]) => ({
                section,
                faculty
              }));
            } else if (defaultFaculty) {
              subject.faculty = defaultFaculty._id;
            }
            
            // Update isLab flag if specified
            if (isLab !== undefined) {
              subject.isLab = isLab;
            }
            
            await subject.save();
          }

          // Link faculty to subject
          const allFaculty = [...sectionFacultyMap.values()];
          if (defaultFaculty) allFaculty.push(defaultFaculty);
          
          for (const faculty of allFaculty) {
            await Faculty.findByIdAndUpdate(faculty._id, { $addToSet: { subjects: subject._id } });
          }

          results.push({ 
            subject: subjectName,
            course: course.courseName,
            year,
            semester,
            status: 'ok', 
            subjectId: subject._id,
            sectionsCreated: sectionsCreated.length > 0 ? sectionsCreated : undefined,
            sectionFacultyCount: sectionFacultyArray.length
          });

        } catch (error) {
          console.error('Error processing subject group:', error);
          results.push({ 
            subject: group.subjectName, 
            status: 'error', 
            reason: error.message 
          });
        }
      }

      // Summary logging
      const successCount = results.filter(r => r.status === 'ok').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalSectionsCreated = results.reduce((sum, r) => sum + (r.sectionsCreated?.length || 0), 0);
      
      console.log(`\n[Bulk Upload Summary]`);
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Errors: ${errorCount}`);
      console.log(`📅 Year-Semesters auto-created: ${yearSemestersCreated.length}`);
      if (yearSemestersCreated.length > 0) {
        console.log(`   ${yearSemestersCreated.join(', ')}`);
      }
      console.log(`📚 Total sections auto-created: ${totalSectionsCreated}`);
      console.log(`📊 Results:`, results.map(r => ({ subject: r.subject, course: r.course, status: r.status })));
      
      res.json({ results });
    } catch (error) {
      console.error('Bulk upload faculty error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};
