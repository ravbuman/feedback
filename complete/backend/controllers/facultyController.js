const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Get all faculty
exports.getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ isActive: true }).populate('subjects').sort({ name: 1 });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new faculty
exports.createFaculty = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phoneNumber, designation, department } = req.body;

  try {
    if (phoneNumber) {
      let faculty = await Faculty.findOne({ phoneNumber });
      if (faculty) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    faculty = new Faculty({
      name,
      phoneNumber,
      designation,
      department,
    });

    await faculty.save();
    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update faculty
exports.updateFaculty = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phoneNumber, designation, department } = req.body;

  try {
    let faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Check if phone number is being changed and if the new one already exists
    if (phoneNumber && phoneNumber !== faculty.phoneNumber) { // phoneNumber is truthy
      const existingFaculty = await Faculty.findOne({ phoneNumber });
      if (existingFaculty) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    faculty.name = name;
    faculty.phoneNumber = phoneNumber;
    faculty.designation = designation;
    faculty.department = department;

    await faculty.save();
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete (deactivate) faculty
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    faculty.isActive = false;
    await faculty.save();

    // Also unassign this faculty from any subjects
    await Subject.updateMany({ faculty: req.params.id }, { $unset: { faculty: "" } });

    res.json({ message: 'Faculty deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Bulk upload faculty and subjects
exports.bulkUploadFaculty = async (req, res) => {
  const { items } = req.body;

  try {
    const results = [];
    for (const item of items) {
      let faculty;
      // Find or create faculty
      // Note: Sessions are removed for simplicity; transactions can be added back if complex atomicity is needed.
      if (item.phoneNumber) {
        faculty = await Faculty.findOne({ phoneNumber: item.phoneNumber });
      }

      if (!faculty) {
        faculty = await Faculty.findOne({ name: item.name, department: item.department });
      }

      if (!faculty) {
        faculty = new Faculty({
          name: item.name,
          phoneNumber: item.phoneNumber,
          department: item.department,
          designation: item.designation,
        });
        await faculty.save();
      }

      // Find or create subject
      const course = await Course.findOne({ courseName: item.subject.courseName });
      if (!course) {
        // This case should ideally be handled by frontend validation
        throw new Error(`Course '${item.subject.courseName}' not found.`);
      }

      let subject = await Subject.findOne({
        subjectName: item.subject.name,
        course: course._id,
        year: item.subject.year,
        semester: item.subject.semester,
      });

      if (!subject) {
        subject = new Subject({
          subjectName: item.subject.name,
          subjectCode: item.subject.code,
          course: course._id,
          year: item.subject.year,
          semester: item.subject.semester,
          faculty: faculty._id,
        });
        await subject.save();
      } else {
        subject.faculty = faculty._id;
        await subject.save();
      }

      // Add subject to faculty's list
      if (!faculty.subjects.includes(subject._id)) {
        faculty.subjects.push(subject._id);
        await faculty.save();
      }
      results.push({ faculty, subject });
    }

    res.status(201).json({ message: 'Bulk upload successful', data: results });
  } catch (error) {
    res.status(500).json({ message: 'Bulk upload failed', error: error.message });
  }
};