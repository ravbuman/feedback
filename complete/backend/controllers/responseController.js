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
    const { formId, subjectId, courseId, year, semester, activationPeriod } = req.query;

    // Build filter
    const filter = {};
    if (formId) filter['subjectResponses.form'] = formId;
    if (subjectId) filter['subjectResponses.subject'] = subjectId;
    if (courseId) filter['courseInfo.course'] = courseId;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      if (form && form.activationPeriods) {
        const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
        if (period) {
          filter['submittedAt'] = { $gte: period.start, $lte: period.end };
        }
      }
    }

    // Get all responses
    const responses = await Response.find(filter)
      .populate('subjectResponses.subject', 'subjectName')
      .populate('courseInfo.course', 'courseName courseCode');

    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this form' });
    }

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
      Faculty.countDocuments(),
      Subject.countDocuments(),
      Course.countDocuments(),
      FeedbackForm.countDocuments(),
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
    const { course, year, semester, formId, activationPeriod } = req.query;

    const filter = {};
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (activationPeriod) {
      const form = await FeedbackForm.findById(formId);
      const period = form?.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
      if (period) {
        filter['activationPeriodStart'] = period.start;
      } else {
        filter['activationPeriodStart'] = new Date(activationPeriod);
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


const getFacultyQuestionAnalytics = async (req, res) => {
  try {
    const { formId, course, year, semester, subject, activationPeriod } = req.query;

    // Build filter
    const filter = {};
    if (formId) filter['subjectResponses.form'] = formId;
    if (course) filter['courseInfo.course'] = course;
    if (year) filter['courseInfo.year'] = parseInt(year);
    if (semester) filter['courseInfo.semester'] = parseInt(semester);
    if (subject) filter['subjectResponses.subject'] = subject;
    if (activationPeriod) {
      // Ensure activationPeriodStart in filter is a Date object for proper comparison
      filter['activationPeriodStart'] = new Date(activationPeriod);
    }

    // Get all responses and populate necessary data
    const responses = await Response.find(filter)
      .populate({
        path: 'subjectResponses.subject',
        populate: {
          path: 'faculty',
          model: 'Faculty'
        }
      })
      .populate('subjectResponses.form');

    if (responses.length === 0) {
      return res.json([]);
    }

    // Group responses by faculty
    const facultyData = {};

    responses.forEach(response => {
      response.subjectResponses.forEach(sr => {
        if (sr.subject && sr.subject.faculty) {
          const facultyId = sr.subject.faculty._id.toString();
          if (!facultyData[facultyId]) {
            facultyData[facultyId] = {
              faculty: sr.subject.faculty,
              responses: []
            };
          }
          facultyData[facultyId].responses.push(sr);
        }
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


    // Process analytics for each faculty
    const result = Object.values(facultyData).map(data => {
      const { faculty, responses } = data;

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

      const subjectNames = [...new Set(responses.map(sr => sr.subject.subjectName))];

      return {
        faculty,
        subjects: subjectNames,
        questionAnalytics,
      };
    });

    res.json(result);

  } catch (error) {
    console.error('Get faculty question analytics error:', error);
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
  deleteResponse,
  getFacultyQuestionAnalytics
};