const mongoose = require('mongoose');

const questionDetailSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['text', 'scale', 'yesno', 'multiplechoice', 'textarea'],
    required: true
  },
  options: [{
    type: String
  }],
  isRequired: {
    type: Boolean,
    default: true
  },
  scaleMin: {
    type: Number,
    default: 1
  },
  scaleMax: {
    type: Number,
    default: 5
  }
});

const subjectResponseSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true
  },
  questions: [questionDetailSchema],
  answers: [{
    type: mongoose.Schema.Types.Mixed
  }]
});

const responseSchema = new mongoose.Schema({
  // Student information
  studentInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true
    }
  },
  // Course information
  courseInfo: {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    semester: {
      type: Number,
      required: true
    }
  },
  // All subjects responses for this student
  subjectResponses: [subjectResponseSchema],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
responseSchema.index({ 'courseInfo.course': 1, 'courseInfo.year': 1, 'courseInfo.semester': 1 });
responseSchema.index({ 'studentInfo.rollNumber': 1 });
responseSchema.index({ 'subjectResponses.subject': 1 });
responseSchema.index({ 'subjectResponses.form': 1 });

module.exports = mongoose.model('Response', responseSchema);