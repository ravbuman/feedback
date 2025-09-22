const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['text', 'scale', 'yesno', 'multiplechoice', 'textarea'],
    required: true
  },
  options: [{
    type: String,
    trim: true
  }], // For multiple choice questions
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

const feedbackFormSchema = new mongoose.Schema({
  formName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [questionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  activationPeriods: [
    {
      start: { type: Date },
      end: { type: Date },
    }
  ],
  createdBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeedbackForm', feedbackFormSchema);
