# Section-Specific Faculty Assignment Implementation

## Overview
Implemented section-specific faculty assignments for subjects, allowing different faculty to teach the same subject to different sections.

---

## Problem Solved

### **Before:**
```
CSE - Year 2, Semester 1 - Data Structures
├─ Section A → Faculty: John Doe
├─ Section B → Faculty: John Doe  ❌ Same faculty for all
├─ Section C → Faculty: John Doe
└─ Section D → Faculty: John Doe

Subject Model:
{
  faculty: ObjectId  // ❌ Only ONE faculty for ALL sections
}
```

### **After:**
```
CSE - Year 2, Semester 1 - Data Structures
├─ Section A → Faculty: John Doe     ✅
├─ Section B → Faculty: Jane Smith   ✅ Different faculty
├─ Section C → Faculty: John Doe     ✅
└─ Section D → Faculty: John Doe     ✅

Subject Model:
{
  sectionFaculty: [
    { section: "A_id", faculty: "john_id" },
    { section: "B_id", faculty: "jane_id" },
    { section: "C_id", faculty: "john_id" },
    { section: "D_id", faculty: "john_id" }
  ],
  faculty: ObjectId  // Default faculty (backward compatible)
}
```

---

## Changes Made

### **1. Subject Model (backend/models/Subject.js)**

**Added:**
```javascript
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
  // ... existing fields
  
  subjectCode: {  // ✅ NEW
    type: String,
    trim: true
  },
  
  // ✅ NEW: Section-specific faculty assignments
  sectionFaculty: [sectionFacultySchema],
  
  // Keep for backward compatibility
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: false
  },
  
  // ... rest of fields
});
```

---

### **2. Student Controller (backend/controllers/studentController.js)**

**Updated `getSubjectsByCourse`:**

```javascript
const getSubjectsByCourse = async (req, res) => {
  const { courseId, year, semester } = req.params;
  const { section } = req.query; // ✅ NEW: Section query parameter

  const subjects = await Subject.find({
    course: courseId,
    year: parseInt(year),
    semester: parseInt(semester),
    isActive: true
  })
    .populate('course', 'courseName courseCode')
    .populate('faculty', 'name designation department')
    .populate('sectionFaculty.faculty', 'name designation department') // ✅ NEW
    .sort({ subjectName: 1 });

  // ✅ NEW: If section provided, return section-specific faculty
  if (section) {
    const formattedSubjects = subjects.map(subject => {
      const sectionFacultyEntry = subject.sectionFaculty.find(
        sf => sf.section.toString() === section
      );
      
      const facultyForSection = sectionFacultyEntry ? 
        sectionFacultyEntry.faculty : subject.faculty;
      
      return {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        course: subject.course,
        year: subject.year,
        semester: subject.semester,
        faculty: facultyForSection, // ✅ Section-specific faculty
        isActive: subject.isActive,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt
      };
    });
    
    return res.json(formattedSubjects);
  }

  // Backward compatibility: return subjects with default faculty
  res.json(subjects);
};
```

---

### **3. Admin Controller (backend/controllers/adminController.js)**

**Updated `createSubject`:**

```javascript
const createSubject = async (req, res) => {
  const subject = new Subject(req.body);
  await subject.save();

  // ✅ NEW: Handle section-specific faculty assignments
  if (req.body.sectionFaculty && Array.isArray(req.body.sectionFaculty)) {
    const facultyIds = [...new Set(req.body.sectionFaculty.map(sf => sf.faculty))];
    for (const facultyId of facultyIds) {
      await Faculty.findByIdAndUpdate(
        facultyId,
        { $addToSet: { subjects: subject._id } }
      );
    }
  }

  // Handle default faculty
  if (req.body.faculty) {
    await Faculty.findByIdAndUpdate(
      req.body.faculty,
      { $addToSet: { subjects: subject._id } }
    );
  }

  await subject.populate('sectionFaculty.faculty', 'name designation department');
  // ... rest
};
```

**Updated `updateSubject`:**

```javascript
const updateSubject = async (req, res) => {
  const oldSubject = await Subject.findById(req.params.id);
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });

  // ✅ NEW: Handle section-specific faculty changes
  const oldSectionFacultyIds = oldSubject.sectionFaculty ? 
    [...new Set(oldSubject.sectionFaculty.map(sf => sf.faculty.toString()))] : [];
  const newSectionFacultyIds = req.body.sectionFaculty ? 
    [...new Set(req.body.sectionFaculty.map(sf => sf.faculty))] : [];

  // Remove subject from faculties no longer assigned
  const removedFacultyIds = oldSectionFacultyIds.filter(id => !newSectionFacultyIds.includes(id));
  for (const facultyId of removedFacultyIds) {
    await Faculty.findByIdAndUpdate(facultyId, { $pull: { subjects: subject._id } });
  }

  // Add subject to newly assigned faculties
  const addedFacultyIds = newSectionFacultyIds.filter(id => !oldSectionFacultyIds.includes(id));
  for (const facultyId of addedFacultyIds) {
    await Faculty.findByIdAndUpdate(facultyId, { $addToSet: { subjects: subject._id } });
  }

  // Handle default faculty changes (existing logic)
  // ...
};
```

---

### **4. Frontend API Service (frontend/src/services/api.js)**

**Updated `getSubjectsByCourse`:**

```javascript
export const studentAPI = {
  getSubjectsByCourse: (courseId, year, semester, section) => {
    const params = section ? { section } : {}; // ✅ NEW: Pass section as query param
    return api.get(`/student/subjects/${courseId}/${year}/${semester}`, { params });
  },
  // ... rest
};
```

---

### **5. Frontend Student Submission (frontend/src/pages/StudentFeedbackSubmission.jsx)**

**Updated `fetchSubjects`:**

```javascript
const fetchSubjects = async (courseId, year, semester, section) => {
  if (feedbackForm?.isGlobal) {
    // Global form logic
  } else {
    // ✅ NEW: Pass section to API
    const response = await studentAPI.getSubjectsByCourse(courseId, year, semester, section);
    setSubjects(response.data);
  }
};
```

**Updated useEffect:**

```javascript
useEffect(() => {
  if (watchedCourse && watchedYear && watchedSemester) {
    const section = watch('section'); // ✅ NEW: Get section value
    fetchSubjects(watchedCourse, watchedYear, watchedSemester, section);
  }
}, [watchedCourse, watchedYear, watchedSemester, watch('section')]); // ✅ NEW: Watch section
```

---

## Data Flow

### **Student Submission Flow:**

```
1. Student selects:
   - Course: CSE
   - Year: 2
   - Semester: 1
   - Section: B  ← IMPORTANT!

2. Frontend calls API:
   GET /student/subjects/cse_id/2/1?section=section_b_id

3. Backend finds subjects:
   - Course = CSE
   - Year = 2
   - Semester = 1
   - Active = true

4. Backend filters by section:
   - Finds sectionFaculty entry where section = section_b_id
   - Returns faculty for Section B (Jane Smith)

5. Student sees:
   - Data Structures → Faculty: Jane Smith ✅
   - Operating Systems → Faculty: Jane Smith ✅
```

---

## Example Data Structure

### **Subject Document:**

```javascript
{
  _id: "subject123",
  subjectName: "Data Structures",
  subjectCode: "DS",
  course: "cse_course_id",
  year: 2,
  semester: 1,
  
  // ✅ Section-specific faculty assignments
  sectionFaculty: [
    {
      section: "section_a_id",
      faculty: "john_doe_id"
    },
    {
      section: "section_b_id",
      faculty: "jane_smith_id"
    },
    {
      section: "section_c_id",
      faculty: "john_doe_id"
    },
    {
      section: "section_d_id",
      faculty: "john_doe_id"
    }
  ],
  
  // Default faculty (backward compatible)
  faculty: "john_doe_id",
  
  isActive: true
}
```

---

## API Examples

### **Fetch Subjects WITHOUT Section (Backward Compatible):**

**Request:**
```
GET /student/subjects/cse_id/2/1
```

**Response:**
```json
[
  {
    "_id": "subject123",
    "subjectName": "Data Structures",
    "faculty": {
      "_id": "john_id",
      "name": "John Doe"
    }
  }
]
```

### **Fetch Subjects WITH Section (NEW):**

**Request:**
```
GET /student/subjects/cse_id/2/1?section=section_b_id
```

**Response:**
```json
[
  {
    "_id": "subject123",
    "subjectName": "Data Structures",
    "faculty": {
      "_id": "jane_id",
      "name": "Jane Smith"
    }
  }
]
```

---

## Benefits

### **1. Flexibility**
- ✅ Different faculty for different sections
- ✅ Same faculty can teach multiple sections
- ✅ Easy to reassign faculty per section

### **2. Accuracy**
- ✅ Students see correct faculty for their section
- ✅ Feedback goes to correct faculty
- ✅ Analytics show section-specific data

### **3. Backward Compatibility**
- ✅ Existing subjects still work (default faculty)
- ✅ API works without section parameter
- ✅ No breaking changes

### **4. Scalability**
- ✅ Supports any number of sections
- ✅ Supports complex faculty assignments
- ✅ Easy to extend further

---

## Files Modified

### **Backend:**
1. `backend/models/Subject.js` - Added sectionFaculty array and subjectCode
2. `backend/controllers/studentController.js` - Updated getSubjectsByCourse
3. `backend/controllers/adminController.js` - Updated createSubject and updateSubject

### **Frontend:**
4. `frontend/src/services/api.js` - Updated getSubjectsByCourse API call
5. `frontend/src/pages/StudentFeedbackSubmission.jsx` - Updated fetchSubjects and useEffect

---

## Next Steps (Frontend UI)

### **Admin Subject Management UI needs update:**

1. **Create Subject Modal:**
   - Show sections for selected year-semester
   - Allow assigning different faculty per section
   - UI: Dropdown per section

2. **Edit Subject Modal:**
   - Show current section-faculty assignments
   - Allow updating faculty per section
   - Show which sections have which faculty

3. **Subject List:**
   - Show section-faculty mappings
   - Display "Multiple Faculty" if different per section

---

## Result

The system now supports:
- ✅ **Section-specific faculty assignments**
- ✅ **Different faculty for different sections**
- ✅ **Same faculty for multiple sections**
- ✅ **Backward compatibility with existing data**
- ✅ **Accurate student feedback submission**
- ✅ **Correct faculty performance analytics**

**Students now see the correct faculty for their specific section!** 🎯✨
