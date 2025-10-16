const Response = require('../models/Response');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const FeedbackForm = require('../models/FeedbackForm');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const fuzz = require('fuzzball');

// Get all responses with filtering options
const getAllResponses = async (req, res) => {
  try {
    const {
      course,
      year,
      semester,
      section,
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
    if (section) filter['courseInfo.section'] = section;
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
    const { formId, subjectId, courseId, year, semester, section, activationPeriod } = req.query;

    // Also accept 'subject' and 'course' keys for compatibility with frontend
    const { subject: subjectParam, course: courseParam } = req.query;

    // Build filter
    const filter = {};
    if (formId) filter['subjectResponses.form'] = formId;
    if (subjectId || subjectParam) filter['subjectResponses.subject'] = subjectId || subjectParam;
    if (courseId || courseParam) filter['courseInfo.course'] = courseId || courseParam;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (section) filter['courseInfo.section'] = section;
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      if (form && form.activationPeriods) {
        const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
        if (period) {
          // If end is not set (active period), only apply lower bound
          if (period.end) {
            filter['submittedAt'] = { $gte: period.start, $lte: period.end };
          } else {
            filter['submittedAt'] = { $gte: period.start };
          }
        }
      }
    }

    // Get all responses
    const responses = await Response.find(filter)
      .populate('subjectResponses.subject', 'subjectName')
      .populate('courseInfo.course', 'courseName courseCode');

    // Do not return 404 for no responses; return an empty analytics payload so UI can handle gracefully
    const noResponses = responses.length === 0;

    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }
    const questions = form.questions;

    // Analyze each question type
    const questionAnalytics = questions.map((question, questionIndex) => {
      // Get all answers for this question across all subjects and responses
      const questionResponses = [];
      responses.forEach(response => {
        response.subjectResponses.forEach(subjectResponse => {
          if (subjectResponse.form.toString() === formId) {
            const responseQuestionIndex = subjectResponse.questions.findIndex(q => q.questionId.toString() === question._id.toString());
            if (responseQuestionIndex !== -1 && subjectResponse.answers[responseQuestionIndex] !== undefined) {
              questionResponses.push(subjectResponse.answers[responseQuestionIndex]);
            }
          }
        });
      });

      let analytics = {
        questionId: question._id, // Use the canonical question ID
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
          if (subjectResponse.subject && subjectResponse.subject._id) {
            allSubjects.add(subjectResponse.subject._id.toString());
          }
        }
      });
    });

    const subjectsCount = (form && form.isGlobal) ? 1 : allSubjects.size;

    const formStats = {
      totalResponses: responses.length,
      uniqueStudents: new Set(responses.map(r => r.studentInfo.rollNumber)).size,
      subjects: subjectsCount,
      courses: [...new Set(responses.map(r => r.courseInfo.course._id.toString()))].length,
      averageCompletionTime: responses.length > 0 ?
        responses.reduce((sum, r) => sum + (new Date(r.submittedAt) - new Date(r.createdAt)), 0) / responses.length : 0
    };

    // If no responses, still return a valid structure with zeroed stats and empty per-question analytics
    res.json({
      form: {
        _id: formId,
        formName: form ? form.formName : 'Unknown Form',
        description: form ? form.description : '',
        totalQuestions: questions.length,
        isGlobal: form ? form.isGlobal : false
      },
      formStats,
      questionAnalytics: noResponses ? questions.map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        totalResponses: 0,
        responseRate: 0
      })) : questionAnalytics
    });
  } catch (error) {
    console.error('Get question analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get response statistics overview
const getResponseStats = async (req, res) => {
  try {
    const { course, year, semester, section } = req.query;

    const filter = {};
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (section) filter['courseInfo.section'] = section;

    // Get total counts from all collections
    const [
      totalResponses,
      totalFaculty,
      totalSubjects,
      totalCourses,
      totalFeedbackForms,
      recentSubmissions,
    ] = await Promise.all([
      Response.countDocuments(filter),
      Faculty.countDocuments({ isActive: { $ne: false } }),
      Subject.countDocuments({ isActive: { $ne: false } }),
      Course.countDocuments({ isActive: { $ne: false } }),
      FeedbackForm.countDocuments({ isActive: { $ne: false } }),
      Response.countDocuments({
        ...filter,
        submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Get submissions by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Response.aggregate([
      {
        $match: {
          ...filter,
          submittedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' },
            day: { $dayOfMonth: '$submittedAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          count: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.json({
      totalResponses,
      recentSubmissions,
      totalCourses,
      totalFaculty,
      totalSubjects,
      totalFeedbackForms,
      dailyStats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get faculty performance analysis
const getFacultyPerformance = async (req, res) => {
  try {
    const { facultyId, course, year, semester, section } = req.query;

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
    if (section) matchFilter['courseInfo.section'] = section;

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
    const { course, year, semester, section, formId, activationPeriod } = req.query;

    const filter = {};
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (section) filter['courseInfo.section'] = section;
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      if (form && form.activationPeriods) {
        const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
        if (period) {
          filter.submittedAt = { $gte: period.start, $lte: period.end };
        }
      }
    }

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

    // If we have a formId, fetch form to detect global/trainingName for fallbacks
    let formDoc = null;
    if (formId) {
      try {
        formDoc = await FeedbackForm.findById(formId);
      } catch (e) {
        formDoc = null;
      }
    }

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
          const subjectName = subjectResponse.subject?.subjectName || (formDoc?.isGlobal ? formDoc.trainingName : 'Unknown Subject');
          const baseData = [
            `"${response.studentInfo.name}"`,
            `"${response.studentInfo.phoneNumber || ''}"`,
            `"${response.studentInfo.rollNumber}"`,
            `"${response.courseInfo.course.courseName}"`,
            response.courseInfo.year,
            response.courseInfo.semester,
            `"${subjectName}"`,
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


const getFacultyQuestionAnalytics = async (req, res) => {
  try {
    const { formId, course, year, semester, section, subject, activationPeriod } = req.query;

    // Build filter
    const filter = {};
    if (formId) filter['subjectResponses.form'] = formId;
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (section) filter['courseInfo.section'] = section;
    if (subject) filter['subjectResponses.subject'] = subject;
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      if (form && form.activationPeriods) {
        const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
        if (period) {
          if (period.end) {
            filter.submittedAt = { $gte: period.start, $lte: period.end };
          } else {
            filter.submittedAt = { $gte: period.start };
          }
        }
      }
    }

    // Get all responses and populate necessary data
    const responses = await Response.find(filter)
      .populate({
        path: 'subjectResponses.subject',
        populate: [
          {
            path: 'faculty',
            model: 'Faculty'
          },
          {
            path: 'sectionFaculty.faculty',
            model: 'Faculty'
          }
        ]
      })
      .populate('subjectResponses.form')
      .populate('courseInfo.course');

    if (responses.length === 0) {
      return res.json([]);
    }

    // Group responses by faculty
    const facultyData = {};

    responses.forEach(response => {
      const studentSection = response.courseInfo.section;
      
      response.subjectResponses.forEach(sr => {
        if (!sr.subject) return;
        
        // Find the correct faculty for this student's section
        let faculty = null;
        
        // Check if subject has section-specific faculty assignments
        if (sr.subject.sectionFaculty && sr.subject.sectionFaculty.length > 0 && studentSection) {
          // Find faculty for this specific section
          const sectionFacultyEntry = sr.subject.sectionFaculty.find(
            sf => sf.section && sf.section.toString() === studentSection.toString()
          );
          if (sectionFacultyEntry && sectionFacultyEntry.faculty) {
            faculty = sectionFacultyEntry.faculty;
          }
        }
        
        // Fall back to default faculty if no section-specific faculty found
        if (!faculty && sr.subject.faculty) {
          faculty = sr.subject.faculty;
        }
        
        // If still no faculty, create a placeholder "Not Assigned" faculty
        if (!faculty) {
          faculty = {
            _id: 'not-assigned',
            name: 'Not Assigned',
            designation: '',
            department: ''
          };
        }
        
        const facultyId = faculty._id.toString ? faculty._id.toString() : faculty._id;
        if (!facultyData[facultyId]) {
          facultyData[facultyId] = {
            faculty: faculty,
            responses: [],
            subjects: new Set()
          };
        }
        facultyData[facultyId].responses.push(sr);
        facultyData[facultyId].subjects.add(sr.subject.subjectName);
      });
    });

    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Feedback form not found' });
    }
    const questions = form.questions;

    const stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
      'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
      'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
      'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
      'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
      'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
      'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
      'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
      'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
      'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
      'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where',
      'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
      'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
      'good', 'bad', 'ok', 'okay', 'nice'
    ]);

    const stemmer = (word) => {
      const step1 = (w) => {
        if (w.endsWith('sses')) return w.slice(0, -2);
        if (w.endsWith('ies')) return w.slice(0, -2) + 'i';
        if (w.endsWith('ss')) return w;
        if (w.endsWith('s')) return w.slice(0, -1);
        return w;
      };

      const step2 = (w) => {
        if (w.endsWith('eed')) return w.slice(0, -1);
        if (w.endsWith('ed') && w.length > 3) {
          const stem = w.slice(0, -2);
          if (/[aeiou]/.test(stem)) {
            if (['at', 'bl', 'iz'].includes(stem.slice(-2))) return stem + 'e';
            if (/(.)\1$/.test(stem) && !['l', 's', 'z'].includes(stem.slice(-1))) return stem.slice(0, -1);
            return stem;
          }
        }
        if (w.endsWith('ing') && w.length > 4) {
          const stem = w.slice(0, -3);
          if (/[aeiou]/.test(stem)) {
            if (['at', 'bl', 'iz'].includes(stem.slice(-2))) return stem + 'e';
            if (/(.)\1$/.test(stem) && !['l', 's', 'z'].includes(stem.slice(-1))) return stem.slice(0, -1);
            return stem;
          }
        }
        return w;
      };

      let stemmed = step1(word);
      stemmed = step2(stemmed);
      return stemmed;
    };


    // If form is global, aggregate overall analytics instead of faculty-wise (since subjects may not be linked to faculty)
    if (form.isGlobal) {
      // Collect all subjectResponses for this form across all responses
      const allSubjectResponses = [];
      responses.forEach(r => {
        r.subjectResponses.forEach(sr => {
          if (!sr.form) return;
          const formIdFromSr = sr.form._id ? sr.form._id.toString() : sr.form.toString();
          if (formIdFromSr === formId) {
            allSubjectResponses.push(sr);
          }
        });
      });

      const overallQuestionAnalytics = questions.map((question, index) => {
        const answers = allSubjectResponses.map(sr => sr.answers[index]).filter(a => a !== undefined && a !== null);

        let analyticsData = {};
        switch (question.questionType) {
          case 'scale': {
            const scaleValues = answers.map(a => parseInt(a)).filter(v => !isNaN(v));
            if (scaleValues.length > 0) {
              analyticsData = {
                average: scaleValues.reduce((s, v) => s + v, 0) / scaleValues.length,
              };
            }
            break;
          }
          case 'yesno': {
            const yesCount = answers.filter(a => a === 'yes' || a === true).length;
            const noCount = answers.filter(a => a === 'no' || a === false).length;
            const total = yesCount + noCount;
            if (total > 0) {
              analyticsData = {
                yesPercentage: (yesCount / total) * 100,
                noPercentage: (noCount / total) * 100,
              };
            }
            break;
          }
          case 'multiplechoice': {
            const choiceCounts = answers.flat().reduce((acc, choice) => {
              acc[choice] = (acc[choice] || 0) + 1;
              return acc;
            }, {});
            analyticsData = { choiceCounts };
            break;
          }
          case 'text':
          case 'textarea': {
            const allWords = answers.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
            const stemmedWords = allWords.map(w => stemmer(w));
            const wordCounts = stemmedWords.reduce((acc, word) => {
              acc[word] = (acc[word] || 0) + 1;
              return acc;
            }, {});
            const frequentWords = Object.entries(wordCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([word, count]) => ({ word, count }));
            analyticsData = { frequentWords };
            break;
          }
          default:
            break;
        }

        return {
          questionId: question._id,
          questionText: question.questionText,
          questionType: question.questionType,
          analytics: analyticsData,
        };
      });

      const subjectNames = [...new Set(allSubjectResponses.map(sr => sr.subject?.subjectName).filter(Boolean))];

      return res.json([
        {
          faculty: {
            _id: 'overall',
            name: form.trainingName || 'Overall',
            designation: '',
            department: ''
          },
          subjects: subjectNames.length > 0 ? subjectNames : [form.trainingName || 'Global'],
          questionAnalytics: overallQuestionAnalytics,
        }
      ]);
    }

    // Process analytics for each faculty for non-global forms
    const result = Object.values(facultyData).map(data => {
      const { faculty, responses, subjects } = data;

      const questionAnalytics = questions.map((question, index) => {
        const answers = responses.map(sr => sr.answers[index]).filter(a => a !== undefined && a !== null);

        let analyticsData = {};

        switch (question.questionType) {
          case 'scale':
            const scaleValues = answers.map(a => parseInt(a)).filter(v => !isNaN(v));
            if (scaleValues.length > 0) {
              analyticsData = {
                average: scaleValues.reduce((s, v) => s + v, 0) / scaleValues.length,
              };
            }
            break;
          case 'yesno':
            const yesCount = answers.filter(a => a === 'yes' || a === true).length;
            const noCount = answers.filter(a => a === 'no' || a === false).length;
            const total = yesCount + noCount;
            if (total > 0) {
              analyticsData = {
                yesPercentage: (yesCount / total) * 100,
                noPercentage: (noCount / total) * 100,
              };
            }
            break;
          case 'multiplechoice':
            const choiceCounts = answers.flat().reduce((acc, choice) => {
              acc[choice] = (acc[choice] || 0) + 1;
              return acc;
            }, {});
            analyticsData = { choiceCounts: choiceCounts };
            break;
          case 'text':
          case 'textarea':
            const allWords = answers.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
            const stemmedWords = allWords.map(w => stemmer(w));
            const wordCounts = stemmedWords.reduce((acc, word) => {
              acc[word] = (acc[word] || 0) + 1;
              return acc;
            }, {});
            const frequentWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => ({ word, count }));
            analyticsData = { frequentWords };
            break;
          default:
            break;
        }

        return {
          questionId: question._id,
          questionText: question.questionText,
          questionType: question.questionType,
          analytics: analyticsData,
        };
      });

      return {
        faculty,
        subjects: Array.from(subjects),
        questionAnalytics,
      };
    });

    res.json(result);

  } catch (error) {
    console.error('Get faculty question analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export comprehensive analytics to Excel (Year-wise worksheets)
const exportComprehensiveAnalytics = async (req, res) => {
  try {
    const { formId, course, activationPeriod } = req.query;

    if (!formId) {
      return res.status(400).json({ message: 'Form ID is required' });
    }

    // Build filter and get period info
    const filter = { 'subjectResponses.form': formId };
    if (course) filter['courseInfo.course'] = course;
    
    let selectedPeriod = null;
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      if (form && form.activationPeriods) {
        const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
        if (period) {
          selectedPeriod = period; // Store for title generation
          if (period.end) {
            filter.submittedAt = { $gte: period.start, $lte: period.end };
          } else {
            filter.submittedAt = { $gte: period.start };
          }
        }
      }
    }

    // Fetch all responses with full population
    const responses = await Response.find(filter)
      .populate({
        path: 'courseInfo.course',
        select: 'courseName courseCode yearSemesterSections'
      })
      .populate({
        path: 'subjectResponses.subject',
        populate: [
          {
            path: 'faculty',
            model: 'Faculty',
            select: 'name designation department'
          },
          {
            path: 'sectionFaculty.faculty',
            model: 'Faculty',
            select: 'name designation department'
          }
        ]
      })
      .populate('subjectResponses.form');

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found' });
    }

    // Get form details
    const form = await FeedbackForm.findById(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Group data by Year → Course → Semester → Section → Subject → Faculty
    const yearData = {};

    responses.forEach(response => {
      const year = response.courseInfo.year;
      const semester = response.courseInfo.semester;
      const courseName = response.courseInfo.course.courseName;
      const courseObj = response.courseInfo.course;
      const sectionId = response.courseInfo.section;
      
      // Find section name from year-semester specific sections
      let sectionName = '';
      if (sectionId && courseObj.yearSemesterSections) {
        const yearSemData = courseObj.yearSemesterSections.find(
          ys => ys.year === year && ys.semester === semester
        );
        if (yearSemData) {
          const section = yearSemData.sections.find(s => s._id.toString() === sectionId.toString());
          sectionName = section ? section.sectionName : '';
        }
      }

      response.subjectResponses.forEach(sr => {
        if (sr.form && sr.form._id.toString() === formId && sr.subject) {
          const subjectName = sr.subject.subjectName;
          
          // Find the correct faculty for this student's section
          let faculty = null;
          
          // Check if subject has section-specific faculty assignments
          if (sr.subject.sectionFaculty && sr.subject.sectionFaculty.length > 0 && sectionId) {
            // Find faculty for this specific section
            const sectionFacultyEntry = sr.subject.sectionFaculty.find(
              sf => sf.section && sf.section.toString() === sectionId.toString()
            );
            if (sectionFacultyEntry && sectionFacultyEntry.faculty) {
              faculty = sectionFacultyEntry.faculty;
            }
          }
          
          // Fall back to default faculty if no section-specific faculty found
          if (!faculty && sr.subject.faculty) {
            faculty = sr.subject.faculty;
          }
          
          // If still no faculty, use "Not Assigned" placeholder
          let facultyName = 'Not Assigned';
          let facultyId = 'not-assigned';
          
          if (faculty) {
            facultyName = faculty.name;
            facultyId = faculty._id.toString();
          } else {
            console.warn(`No faculty found for subject ${subjectName} in section ${sectionName} - grouping under "Not Assigned"`);
          }

          // Create unique key
          const key = `${year}|${semester}|${courseName}|${sectionName}|${subjectName}|${facultyId}`;

          if (!yearData[year]) yearData[year] = {};
          if (!yearData[year][key]) {
            yearData[year][key] = {
              courseName,
              year,
              semester,
              sectionName,
              subjectName,
              facultyName,
              facultyId,
              responseCount: 0,
              responses: [],
              questionData: {}
            };
          }

          yearData[year][key].responseCount++;
          yearData[year][key].responses.push({
            answers: sr.answers,
            questions: sr.questions
          });
        }
      });
    });

    // Calculate question analytics for each group
    Object.keys(yearData).forEach(year => {
      Object.keys(yearData[year]).forEach(key => {
        const group = yearData[year][key];
        
        form.questions.forEach((question, qIndex) => {
          const answers = group.responses
            .map(r => r.answers[qIndex])
            .filter(a => a !== undefined && a !== null && a !== '');

          let analytics = '';

          switch (question.questionType) {
            case 'scale':
              const scaleValues = answers.map(a => parseInt(a)).filter(v => !isNaN(v));
              if (scaleValues.length > 0) {
                const avg = scaleValues.reduce((s, v) => s + v, 0) / scaleValues.length;
                analytics = avg.toFixed(2);
              }
              break;

            case 'yesno':
              const yesCount = answers.filter(a => a === 'yes' || a === true).length;
              const total = answers.length;
              if (total > 0) {
                const yesPercent = ((yesCount / total) * 100).toFixed(1);
                analytics = `${yesPercent}% Yes`;
              }
              break;

            case 'multiplechoice':
              const choiceCounts = {};
              answers.forEach(a => {
                if (Array.isArray(a)) {
                  a.forEach(choice => {
                    choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
                  });
                } else {
                  choiceCounts[a] = (choiceCounts[a] || 0) + 1;
                }
              });
              const topChoice = Object.entries(choiceCounts)
                .sort((a, b) => b[1] - a[1])[0];
              if (topChoice) {
                analytics = `${topChoice[0]} (${topChoice[1]})`;
              }
              break;

            case 'text':
            case 'textarea':
              // Use fuzzy matching to group similar responses
              const groupedResponses = [];
              const processedAnswers = answers.map(a => String(a).trim().toLowerCase());
              
              processedAnswers.forEach(answer => {
                if (!answer) return;
                
                // Try to find a similar existing group (80% similarity threshold)
                let foundGroup = false;
                for (let group of groupedResponses) {
                  const similarity = fuzz.ratio(answer, group.text.toLowerCase());
                  if (similarity >= 80) {
                    group.count++;
                    foundGroup = true;
                    break;
                  }
                }
                
                // If no similar group found, create new one
                if (!foundGroup) {
                  groupedResponses.push({
                    text: answers[processedAnswers.indexOf(answer)], // Original case
                    count: 1
                  });
                }
              });
              
              // Sort by count (descending) and format
              groupedResponses.sort((a, b) => b.count - a.count);
              
              // Create formatted string with top responses
              if (groupedResponses.length > 0) {
                const topResponses = groupedResponses.slice(0, 5); // Top 5 responses
                analytics = topResponses
                  .map(r => `"${r.text}" (${r.count})`)
                  .join('\n');
              } else {
                analytics = 'No responses';
              }
              break;
          }

          group.questionData[`Q${qIndex + 1}`] = analytics;
        });
      });
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Feedback System';
    workbook.created = new Date();

    // Sort years
    const sortedYears = Object.keys(yearData).sort((a, b) => parseInt(a) - parseInt(b));

    // Generate report title with dynamic date
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    let reportMonth = '';
    let reportYear = '';
    
    if (selectedPeriod && selectedPeriod.start) {
      const periodDate = new Date(selectedPeriod.start);
      reportMonth = monthNames[periodDate.getMonth()];
      reportYear = periodDate.getFullYear();
    } else {
      // Fallback to current date if no period selected
      const currentDate = new Date();
      reportMonth = monthNames[currentDate.getMonth()];
      reportYear = currentDate.getFullYear();
    }

    sortedYears.forEach(year => {
      const worksheet = workbook.addWorksheet(`Year ${year}`);

      // Define columns
      const columns = [
        { header: 'BRANCH', key: 'branch', width: 15 },
        { header: 'YEAR & SEM', key: 'yearSem', width: 12 },
        { header: 'SECTION', key: 'section', width: 10 },
        { header: 'NAME OF THE SUBJECT', key: 'subject', width: 25 },
        { header: 'NAME OF THE STAFF', key: 'staff', width: 25 },
        { header: 'STUDENTS GAVE FB', key: 'count', width: 18 }
      ];

      // Add question columns
      form.questions.forEach((q, idx) => {
        columns.push({
          header: `Q${idx + 1}: ${q.questionText.substring(0, 30)}...`,
          key: `Q${idx + 1}`,
          width: 20
        });
      });

      worksheet.columns = columns;

      // Add title rows at the top
      worksheet.insertRow(1, []); // Insert blank row for title 1
      worksheet.insertRow(2, []); // Insert blank row for title 2
      
      const totalColumns = columns.length;
      
      // Title Row 1: College Name
      const titleRow1 = worksheet.getRow(1);
      titleRow1.height = 35;
      worksheet.mergeCells(1, 1, 1, totalColumns);
      const titleCell1 = worksheet.getCell(1, 1);
      titleCell1.value = 'PYDAH COLLEGE OF ENGINEERING(A)';
      titleCell1.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
      titleCell1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB4C7E7' } // Light blue
      };
      titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell1.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      };
      
      // Title Row 2: Report Title with Dynamic Date
      const titleRow2 = worksheet.getRow(2);
      titleRow2.height = 30;
      worksheet.mergeCells(2, 1, 2, totalColumns);
      const titleCell2 = worksheet.getCell(2, 1);
      titleCell2.value = `ACADEMIC FEEDBACK ANALYSIS REPORT-${reportMonth}-${reportYear}`;
      titleCell2.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
      titleCell2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB4C7E7' } // Light blue
      };
      titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell2.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      };

      // Style header row with better colors and spacing (now row 3)
      // Only style cells that have actual header text
      const headerRow = worksheet.getRow(3);
      headerRow.height = 30; // Increased height for better spacing
      
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // Only style cells with actual content (skip empty columns)
        if (cell.value && cell.value.toString().trim() !== '') {
          cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; // White text
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Professional blue color
          };
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true 
          };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
          };
        }
      });

      // Add data rows with grouping
      const rows = Object.values(yearData[year]).sort((a, b) => {
        if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
        if (a.semester !== b.semester) return a.semester - b.semester;
        if (a.sectionName !== b.sectionName) return a.sectionName.localeCompare(b.sectionName);
        return a.subjectName.localeCompare(b.subjectName);
      });

      const yearSemMap = {
        1: { 1: 'I-I', 2: 'I-II' },
        2: { 1: 'II-I', 2: 'II-II' },
        3: { 1: 'III-I', 2: 'III-II' },
        4: { 1: 'IV-I', 2: 'IV-II' }
      };

      // Group rows by course-semester-section
      let currentGroup = null;
      let groupStartRow = 4; // Start after title rows (1, 2) and header (3)
      let currentRowNumber = 4;

      rows.forEach((row, index) => {
        const groupKey = `${row.courseName}|${row.semester}|${row.sectionName}`;
        
        // Check if we're starting a new group
        if (currentGroup !== groupKey) {
          // If there was a previous group, merge its cells
          if (currentGroup !== null && currentRowNumber > groupStartRow) {
            worksheet.mergeCells(groupStartRow, 1, currentRowNumber - 1, 1); // BRANCH
            worksheet.mergeCells(groupStartRow, 2, currentRowNumber - 1, 2); // YEAR & SEM
            worksheet.mergeCells(groupStartRow, 3, currentRowNumber - 1, 3); // SECTION
            
            // Center align merged cells
            worksheet.getCell(groupStartRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getCell(groupStartRow, 2).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getCell(groupStartRow, 3).alignment = { vertical: 'middle', horizontal: 'center' };

            // Add separator row with dark gray background
            const separatorRow = worksheet.getRow(currentRowNumber);
            separatorRow.height = 5;
            for (let col = 1; col <= columns.length; col++) {
              separatorRow.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF808080' }
              };
            }
            currentRowNumber++;
          }
          
          currentGroup = groupKey;
          groupStartRow = currentRowNumber;
        }

        const rowData = {
          branch: row.courseName,
          yearSem: yearSemMap[row.year]?.[row.semester] || `${row.year}-${row.semester}`,
          section: row.sectionName || '',
          subject: row.subjectName,
          staff: row.facultyName,
          count: row.responseCount,
          ...row.questionData
        };

        worksheet.addRow(rowData);
        currentRowNumber++;

        // If this is the last row, merge the final group
        if (index === rows.length - 1 && currentRowNumber > groupStartRow) {
          worksheet.mergeCells(groupStartRow, 1, currentRowNumber - 1, 1); // BRANCH
          worksheet.mergeCells(groupStartRow, 2, currentRowNumber - 1, 2); // YEAR & SEM
          worksheet.mergeCells(groupStartRow, 3, currentRowNumber - 1, 3); // SECTION
          
          // Center align merged cells
          worksheet.getCell(groupStartRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };
          worksheet.getCell(groupStartRow, 2).alignment = { vertical: 'middle', horizontal: 'center' };
          worksheet.getCell(groupStartRow, 3).alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      // Add borders, styling, and spacing to all cells
      worksheet.eachRow((row, rowNumber) => {
        // Skip title rows (1, 2) and separator rows (height = 5)
        if (rowNumber <= 2 || row.height === 5) return;
        
        // Set row height for better spacing (except header and title rows)
        if (rowNumber > 3) {
          row.height = 25; // Increased row height for better readability
        }
        
        row.eachCell((cell, colNumber) => {
          // Add borders (skip title rows)
          if (rowNumber > 2) {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
            };
          }
          
          // Skip title rows and header row styling (already done)
          if (rowNumber <= 3) return;
          
          // Add padding and alignment
          if (!cell.alignment) {
            cell.alignment = { 
              vertical: 'middle', 
              horizontal: 'left',
              wrapText: true,
              indent: 1 // Add left padding
            };
          }
          
          // Center align specific columns
          if (colNumber === 6) { // Count column
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true, size: 11 };
          }
          
          // Alternating row colors for better readability (light blue)
          // Start alternating from row 4 (first data row after title and header)
          if (rowNumber > 3 && (rowNumber - 3) % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0F4FF' } // Very light blue
            };
          }
          
          // Style for text question cells (wrap text for multi-line responses)
          if (colNumber > 6) { // Question columns
            cell.alignment = { 
              vertical: 'top', 
              horizontal: 'left',
              wrapText: true,
              indent: 1
            };
          }
        });
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Feedback_Analytics_${form.formName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export comprehensive analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  getQuestionAnalytics,
  getResponseStats,
  exportToCSV,
  exportComprehensiveAnalytics,
  getFacultyPerformance,
  deleteResponse,
  getFacultyQuestionAnalytics,
  getTextAnswers: async (req, res) => {
    try {
      const { formId, questionId, course, year, semester, section, activationPeriod, page = 1, limit = 50 } = req.query;

      if (!formId || !questionId) {
        return res.status(400).json({ message: 'formId and questionId are required' });
      }

      const filter = {};
      if (formId) filter['subjectResponses.form'] = new mongoose.Types.ObjectId(formId);
      if (course) filter['courseInfo.course'] = course;
      if (year) filter['courseInfo.year'] = parseInt(year);
      if (semester) filter['courseInfo.semester'] = parseInt(semester);
      if (section) filter['courseInfo.section'] = section;
      if (activationPeriod) {
        const form = await FeedbackForm.findById(formId);
        if (form && form.activationPeriods) {
          const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
          if (period) {
            if (period.end) {
              filter.submittedAt = { $gte: period.start, $lte: period.end };
            } else {
              filter.submittedAt = { $gte: period.start };
            }
          }
        }
      }

      const responses = await Response.find(filter)
        .populate('subjectResponses.subject', 'subjectName')
        .sort({ submittedAt: -1 });

      const allAnswers = [];
      responses.forEach(resp => {
        const { studentInfo } = resp;
        resp.subjectResponses.forEach(sr => {
          // For global forms, the form ID is directly on the subjectResponse.
          // The `populate` might make `sr.form` an object, so we check `sr.form` and `sr.form._id`.
          const srFormId = sr.form?._id ? sr.form._id.toString() : sr.form.toString();
          if (srFormId !== formId) {
            return;
          }

          const qIndex = sr.questions.findIndex(q => q.questionId.toString() === questionId);
          if (qIndex === -1) return;

          const answer = sr.answers[qIndex];
          const question = sr.questions[qIndex];
          const qType = question?.questionType || 'text';
          if (!answer || (qType !== 'text' && qType !== 'textarea')) return;

          allAnswers.push({
            answer: String(answer),
            rollNumber: studentInfo?.rollNumber || '',
            submittedAt: resp.submittedAt,
            subjectName: sr.subject?.subjectName || 'Global Form'
          });
        });
      });

      const total = allAnswers.length;
      const p = parseInt(page);
      const l = parseInt(limit);
      const start = (p - 1) * l;
      const end = start + l;

      res.json({
        total,
        page: p,
        limit: l,
        hasMore: end < total,
        answers: allAnswers.slice(start, end)
      });
    } catch (err) {
      console.error('Get text answers error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
  // New endpoints below
  getTextAnswersByFaculty: async (req, res) => {
    try {
      const { formId, questionId, course, year, semester, section, subject, activationPeriod, facultyId, page = 1, limit = 50 } = req.query;

      if (!formId || !questionId) {
        return res.status(400).json({ message: 'formId and questionId are required' });
      }

      // Build base filter
      const filter = {};
      if (formId) filter['subjectResponses.form'] = formId;
      if (course) filter['courseInfo.course'] = course;
      if (year) filter['courseInfo.year'] = parseInt(year);
      if (semester) filter['courseInfo.semester'] = parseInt(semester);
      if (section) filter['courseInfo.section'] = section;
      if (subject) filter['subjectResponses.subject'] = subject;
      if (activationPeriod) {
        const form = await FeedbackForm.findById(formId);
        if (form && form.activationPeriods) {
          const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
          if (period) {
            if (period.end) {
              filter.submittedAt = { $gte: period.start, $lte: period.end };
            } else {
              filter.submittedAt = { $gte: period.start };
            }
          }
        }
      }

      // Fetch and populate needed data
      const responses = await Response.find(filter)
        .populate({
          path: 'subjectResponses.subject',
          populate: { path: 'faculty', model: 'Faculty' }
        })
        .populate('subjectResponses.form')
        .sort({ submittedAt: -1 });

      // Group by faculty → collect text answers for the given question only
      const grouped = {};

      responses.forEach(resp => {
        const { studentInfo } = resp;
        resp.subjectResponses.forEach(sr => {
          if (!sr.form) return;
          const srFormId = sr.form._id ? sr.form._id.toString() : sr.form.toString();
          if (srFormId !== formId) return;
          if (!sr.subject || !sr.subject.faculty) return;

          const qIndex = sr.questions.findIndex(q => q.questionId.toString() === questionId);
          if (qIndex === -1) return;

          const answer = sr.answers[qIndex];
          const question = sr.questions[qIndex];
          const qType = question?.questionType || 'text';
          if (!answer || (qType !== 'text' && qType !== 'textarea')) return;

          const fid = sr.subject.faculty._id.toString();
          if (facultyId && fid !== facultyId) return;

          if (!grouped[fid]) {
            grouped[fid] = {
              faculty: sr.subject.faculty,
              answers: []
            };
          }

          grouped[fid].answers.push({
            answer: String(answer),
            rollNumber: studentInfo?.rollNumber || '',
            submittedAt: resp.submittedAt,
            subjectName: sr.subject?.subjectName || ''
          });
        });
      });

      // Pagination per faculty: slice answers after grouping
      const result = Object.values(grouped).map(group => {
        const total = group.answers.length;
        const p = parseInt(page);
        const l = parseInt(limit);
        const start = (p - 1) * l;
        const end = start + l;
        return {
          faculty: group.faculty,
          total,
          page: p,
          limit: l,
          hasMore: end < total,
          answers: group.answers.slice(start, end)
        };
      });

      res.json(result);
    } catch (err) {
      console.error('Get text answers by faculty error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
  exportTextAnswersCSV: async (req, res) => {
    try {
      const { formId, questionId, course, year, semester, section, subject, activationPeriod, facultyId } = req.query;
      if (!formId || !questionId) {
        return res.status(400).json({ message: 'formId and questionId are required' });
      }

      const filter = {};
      if (formId) filter['subjectResponses.form'] = formId;
      if (course) filter['courseInfo.course'] = course;
      if (year) filter['courseInfo.year'] = parseInt(year);
      if (semester) filter['courseInfo.semester'] = parseInt(semester);
      if (section) filter['courseInfo.section'] = section;
      if (subject) filter['subjectResponses.subject'] = subject;
      if (activationPeriod) {
        const form = await FeedbackForm.findById(formId);
        if (form && form.activationPeriods) {
          const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
          if (period) {
            if (period.end) {
              filter.submittedAt = { $gte: period.start, $lte: period.end };
            } else {
              filter.submittedAt = { $gte: period.start };
            }
          }
        }
      }

      const responses = await Response.find(filter)
        .populate({
          path: 'subjectResponses.subject',
          populate: { path: 'faculty', model: 'Faculty' }
        })
        .populate('subjectResponses.form')
        .sort({ submittedAt: -1 });

      let rows = [];
      responses.forEach(resp => {
        const { studentInfo } = resp;
        resp.subjectResponses.forEach(sr => {
          if (!sr.form) return;
          const srFormId = sr.form._id ? sr.form._id.toString() : sr.form.toString();
          if (srFormId !== formId) return;
          if (!sr.subject || !sr.subject.faculty) return;

          const qIndex = sr.questions.findIndex(q => q.questionId.toString() === questionId);
          if (qIndex === -1) return;

          const answer = sr.answers[qIndex];
          const question = sr.questions[qIndex];
          const qType = question?.questionType || 'text';
          if (!answer || (qType !== 'text' && qType !== 'textarea')) return;

          const fid = sr.subject.faculty._id.toString();
          if (facultyId && fid !== facultyId) return;

          rows.push({
            facultyName: sr.subject.faculty.name,
            rollNumber: studentInfo?.rollNumber || '',
            subjectName: sr.subject?.subjectName || '',
            submittedAt: resp.submittedAt,
            answer: String(answer)
          });
        });
      });

      // Build CSV
      let csv = 'Faculty,Roll Number,Subject,Submitted At,Answer\n';
      rows.forEach(r => {
        const vals = [r.facultyName, r.rollNumber, r.subjectName, new Date(r.submittedAt).toISOString(), r.answer]
          .map(v => '"' + String(v).replace(/"/g, '""') + '"');
        csv += vals.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=text_answers.csv');
      res.send(csv);
    } catch (err) {
      console.error('Export text answers CSV error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};