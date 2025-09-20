const Response = require('../models/Response');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const FeedbackForm = require('../models/FeedbackForm');
const mongoose = require('mongoose');

// Get all responses with filtering options
const getAllResponses = async (req, res) => {
  try {
    const {
      course,
      year,
      semester,
      subject,
      faculty,
      studentName,
      rollNumber,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (studentName) filter['studentInfo.name'] = { $regex: studentName, $options: 'i' };
    if (rollNumber) filter['studentInfo.rollNumber'] = { $regex: rollNumber, $options: 'i' };
    if (subject) filter.subject = subject;
    if (faculty) {
      // Find subjects taught by this faculty
      const subjects = await Subject.find({ faculty: faculty, isActive: true }).select('_id');
      const subjectIds = subjects.map(s => s._id);
      filter.subject = { $in: subjectIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const responses = await Response.find(filter)
      .populate('courseInfo.course', 'courseName courseCode')
      .populate('subjectResponses.subject', 'subjectName')
      .populate('subjectResponses.form', 'formName')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Response.countDocuments(filter);

    res.json({
      responses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalResponses: total,
        hasNext: skip + responses.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get response by ID
const getResponseById = async (req, res) => {
  try {
    const response = await Response.findById(req.params.id)
      .populate('courseInfo.course', 'courseName courseCode')
      .populate('subjectResponses.subject', 'subjectName')
      .populate('subjectResponses.form', 'formName questions');

    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    res.json(response);
  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get comprehensive analytics for different question types
const getQuestionAnalytics = async (req, res) => {
  try {
    const { formId, subjectId, courseId, year, semester } = req.query;

    // Build filter
    const filter = {};
    if (subjectId) filter['subjectResponses.subject'] = subjectId;
    if (courseId) filter['courseInfo.course'] = courseId;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);

    // Get all responses
    const allResponses = await Response.find(filter)
      .populate('subjectResponses.subject', 'subjectName')
      .populate('courseInfo.course', 'courseName courseCode');

    // Filter responses by formId if specified
    let responses = allResponses;
    if (formId) {
      responses = allResponses.filter(response => 
        response.subjectResponses.some(sr => sr.form.toString() === formId)
      );
    }

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this form' });
    }

    // Get question details from the first response (all responses should have same questions)
    const firstResponse = responses[0];
    const firstSubjectResponse = firstResponse.subjectResponses.find(sr => sr.form.toString() === formId);
    
    if (!firstSubjectResponse || !firstSubjectResponse.questions) {
      return res.status(404).json({ message: 'Question details not found in responses' });
    }

    const questions = firstSubjectResponse.questions;

    // Analyze each question type
    const questionAnalytics = questions.map((question, questionIndex) => {
      // Get all answers for this question across all subjects and responses
      const questionResponses = [];
      responses.forEach(response => {
        response.subjectResponses.forEach(subjectResponse => {
          if (subjectResponse.form.toString() === formId && subjectResponse.answers[questionIndex] !== undefined) {
            questionResponses.push(subjectResponse.answers[questionIndex]);
          }
        });
      });

      let analytics = {
        questionId: question._id,
        questionText: question.questionText,
        questionType: question.questionType,
        totalResponses: questionResponses.length,
        responseRate: responses.length > 0 ? (questionResponses.length / responses.length) * 100 : 0
      };

      switch (question.questionType) {
        case 'scale':
          const scaleValues = questionResponses.map(answer => parseInt(answer)).filter(val => !isNaN(val));
          if (scaleValues.length > 0) {
            analytics.scale = {
              min: Math.min(...scaleValues),
              max: Math.max(...scaleValues),
              average: scaleValues.reduce((sum, val) => sum + val, 0) / scaleValues.length,
              distribution: {}
            };
            
            // Create distribution
            for (let i = question.scaleMin; i <= question.scaleMax; i++) {
              analytics.scale.distribution[i] = scaleValues.filter(val => val === i).length;
            }
          }
          break;

        case 'yesno':
          const yesCount = questionResponses.filter(answer => answer === 'yes' || answer === true).length;
          const noCount = questionResponses.filter(answer => answer === 'no' || answer === false).length;
          analytics.yesno = {
            yes: yesCount,
            no: noCount,
            yesPercentage: questionResponses.length > 0 ? (yesCount / questionResponses.length) * 100 : 0,
            noPercentage: questionResponses.length > 0 ? (noCount / questionResponses.length) * 100 : 0
          };
          break;

        case 'multiplechoice':
          const choiceCounts = {};
          questionResponses.forEach(answer => {
            if (Array.isArray(answer)) {
              answer.forEach(choice => {
                choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
              });
            } else {
              choiceCounts[answer] = (choiceCounts[answer] || 0) + 1;
            }
          });
          
          analytics.multiplechoice = {
            options: question.options.map(option => ({
              text: option,
              count: choiceCounts[option] || 0,
              percentage: questionResponses.length > 0 ? ((choiceCounts[option] || 0) / questionResponses.length) * 100 : 0
            }))
          };
          break;

        case 'text':
        case 'textarea':
          const textResponses = questionResponses.filter(answer => typeof answer === 'string' && answer.trim().length > 0);
          analytics.text = {
            totalTextResponses: textResponses.length,
            averageLength: textResponses.length > 0 ? 
              textResponses.reduce((sum, text) => sum + text.length, 0) / textResponses.length : 0,
            wordCount: textResponses.length > 0 ?
              textResponses.reduce((sum, text) => sum + text.split(' ').length, 0) / textResponses.length : 0,
            sampleResponses: textResponses.slice(0, 5) // First 5 responses as samples
          };
          break;
      }

      return analytics;
    });

    // Get overall form statistics
    const allSubjects = new Set();
    responses.forEach(response => {
      response.subjectResponses.forEach(subjectResponse => {
        if (subjectResponse.form.toString() === formId) {
          allSubjects.add(subjectResponse.subject._id.toString());
        }
      });
    });

    const formStats = {
      totalResponses: responses.length,
      uniqueStudents: new Set(responses.map(r => r.studentInfo.rollNumber)).size,
      subjects: allSubjects.size,
      courses: [...new Set(responses.map(r => r.courseInfo.course._id.toString()))].length,
      averageCompletionTime: responses.length > 0 ? 
        responses.reduce((sum, r) => sum + (new Date(r.submittedAt) - new Date(r.createdAt)), 0) / responses.length : 0
    };

    // Get form details from the database
    const form = await FeedbackForm.findById(formId);
    
    res.json({
      form: {
        _id: formId,
        formName: form ? form.formName : 'Unknown Form',
        description: form ? form.description : '',
        totalQuestions: questions.length
      },
      formStats,
      questionAnalytics
    });
  } catch (error) {
    console.error('Get question analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get response statistics overview
const getResponseStats = async (req, res) => {
  try {
    const { course, year, semester } = req.query;
    
    const filter = {};
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);

    const totalResponses = await Response.countDocuments(filter);
    
    const courseStats = await Response.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$courseInfo.course',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $project: {
          courseName: '$courseInfo.courseName',
          courseCode: '$courseInfo.courseCode',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    const facultyStats = await Response.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: '$subjectInfo' },
      {
        $lookup: {
          from: 'faculties',
          localField: 'subjectInfo.faculty',
          foreignField: '_id',
          as: 'facultyInfo'
        }
      },
      { $unwind: '$facultyInfo' },
      {
        $group: {
          _id: '$subjectInfo.faculty',
          count: { $sum: 1 },
          facultyName: { $first: '$facultyInfo.name' },
          designation: { $first: '$facultyInfo.designation' },
          department: { $first: '$facultyInfo.department' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const subjectStats = await Response.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: '$subjectInfo' },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 },
          subjectName: { $first: '$subjectInfo.subjectName' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSubmissions = await Response.countDocuments({
      ...filter,
      submittedAt: { $gte: sevenDaysAgo }
    });

    // Get submissions by day for the last 7 days
    const dailyStats = await Response.aggregate([
      {
        $match: {
          ...filter,
          submittedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' },
            day: { $dayOfMonth: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      totalResponses,
      recentSubmissions,
      courseStats,
      facultyStats,
      subjectStats,
      dailyStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get faculty performance analysis
const getFacultyPerformance = async (req, res) => {
  try {
    const { facultyId, course, year, semester } = req.query;
    
    // Find subjects taught by this faculty
    const facultySubjects = await Subject.find({ 
      faculty: facultyId, 
      isActive: true 
    }).select('_id subjectName');

    const subjectIds = facultySubjects.map(s => s._id);

    const matchFilter = { subject: { $in: subjectIds } };
    if (course) matchFilter['courseInfo.course'] = course;
    if (year) matchFilter['courseInfo.year'] = parseInt(year);
    if (semester) matchFilter['courseInfo.semester'] = parseInt(semester);

    const facultyPerformance = await Response.aggregate([
      { $match: matchFilter },
      { $unwind: '$subjectResponses' },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectResponses.subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: '$subjectInfo' },
      {
        $lookup: {
          from: 'faculties',
          localField: 'subjectInfo.faculty',
          foreignField: '_id',
          as: 'facultyInfo'
        }
      },
      { $unwind: '$facultyInfo' },
      {
        $group: {
          _id: {
            facultyId: '$subjectInfo.faculty',
            facultyName: '$facultyInfo.name',
            designation: '$facultyInfo.designation',
            department: '$facultyInfo.department',
            subjectId: '$subjectResponses.subject',
            subjectName: '$subjectInfo.subjectName'
          },
          totalResponses: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            facultyId: '$_id.facultyId',
            facultyName: '$_id.facultyName',
            designation: '$_id.designation',
            department: '$_id.department'
          },
          subjects: {
            $push: {
              subjectName: '$_id.subjectName',
              totalResponses: '$totalResponses'
            }
          },
          totalFacultyResponses: { $sum: '$totalResponses' }
        }
      },
      { $sort: { totalFacultyResponses: -1 } }
    ]);

    res.json(facultyPerformance);
  } catch (error) {
    console.error('Get faculty performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export responses to CSV
const exportToCSV = async (req, res) => {
  try {
    const { course, year, semester, formId } = req.query;
    
    const filter = {};
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);

    const allResponses = await Response.find(filter)
      .populate('courseInfo.course', 'courseName courseCode')
      .populate('subjectResponses.subject', 'subjectName')
      .sort({ submittedAt: -1 });

    // Filter responses by formId if specified
    let responses = allResponses;
    if (formId) {
      responses = allResponses.filter(response => 
        response.subjectResponses.some(sr => sr.form.toString() === formId)
      );
    }

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this form' });
    }

    // Get question details from the first response
    const firstResponse = responses[0];
    const firstSubjectResponse = firstResponse.subjectResponses.find(sr => sr.form.toString() === formId);
    
    if (!firstSubjectResponse || !firstSubjectResponse.questions) {
      return res.status(404).json({ message: 'Question details not found in responses' });
    }

    const questions = firstSubjectResponse.questions;

    // Create CSV headers
    let csv = 'Student Name,Phone Number,Roll Number,Course,Year,Semester,Subject,Submitted At';
    
    // Add question headers
    questions.forEach((question, index) => {
      csv += `,Q${index + 1}: ${question.questionText}`;
    });
    csv += '\n';
    
    // Add response data
    responses.forEach(response => {
      response.subjectResponses.forEach(subjectResponse => {
        if (subjectResponse.form.toString() === formId) {
          const baseData = [
            `"${response.studentInfo.name}"`,
            `"${response.studentInfo.phoneNumber || ''}"`,
            `"${response.studentInfo.rollNumber}"`,
            `"${response.courseInfo.course.courseName}"`,
            response.courseInfo.year,
            response.courseInfo.semester,
            `"${subjectResponse.subject.subjectName}"`,
            response.submittedAt
          ];
          
          // Add answers for each question
          questions.forEach((question, index) => {
            const answer = subjectResponse.answers[index];
            let answerText = '';
            
            if (answer !== undefined) {
              if (Array.isArray(answer)) {
                answerText = answer.join('; ');
              } else {
                answerText = String(answer);
              }
            }
            
            baseData.push(`"${answerText}"`);
          });
          
          csv += baseData.join(',') + '\n';
        }
      });
    });

    const formName = questions.length > 0 ? 'feedback_form' : 'unknown_form';
    const filename = `feedback_responses_${formName}_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete response (admin only)
const deleteResponse = async (req, res) => {
  try {
    const response = await Response.findByIdAndDelete(req.params.id);
    
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Delete response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  getQuestionAnalytics,
  getResponseStats,
  exportToCSV,
  getFacultyPerformance,
  deleteResponse
};