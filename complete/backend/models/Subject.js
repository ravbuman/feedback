const mongoose = require('mongoose');

// Schema for section-specific faculty assignments
const sectionFacultySchema = new mongoose.Schema({
  section: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  }
}, { _id: false });

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  // Section-specific faculty assignments (NEW)
  sectionFaculty: [sectionFacultySchema],
  
  // Keep for backward compatibility (subjects without sections)
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: false
  },
  // Lab subject flag - MCQ questions will be treated as text for labs
  isLab: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure unique combination of course, year, semester, and subject name
subjectSchema.index({ course: 1, year: 1, semester: 1, subjectName: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
