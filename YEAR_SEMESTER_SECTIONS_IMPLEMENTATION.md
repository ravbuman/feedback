# Year-Semester Specific Sections Implementation

## Overview
Updated the section management system to make sections specific to **year and semester combinations** instead of being course-wide. This allows different years and semesters to have different sections.

## Problem Solved
**Before**: Sections were applied to the entire course
- If CSE had sections A, B, C, they applied to ALL years and semesters
- No flexibility for different section configurations per year-semester

**After**: Sections are specific to year-semester combinations
- CSE Year 1 Semester 1 can have sections A, B, C
- CSE Year 2 Semester 1 can have NO sections
- CSE Year 3 Semester 1 can have sections A, B only

## Database Schema Changes

### Course Model (`backend/models/Course.js`)

**Old Structure:**
```javascript
{
  courseName: String,
  courseCode: String,
  sections: [
    { sectionName: String, studentCount: Number }
  ]
}
```

**New Structure:**
```javascript
{
  courseName: String,
  courseCode: String,
  yearSemesterSections: [
    {
      year: Number (1-4),
      semester: Number (1-2),
      sections: [
        { sectionName: String, studentCount: Number }
      ]
    }
  ]
}
```

**Example Data:**
```javascript
{
  courseName: "Computer Science Engineering",
  courseCode: "CSE",
  yearSemesterSections: [
    {
      year: 1,
      semester: 1,
      sections: [
        { sectionName: "A", studentCount: 50 },
        { sectionName: "B", studentCount: 52 },
        { sectionName: "C", studentCount: 48 }
      ]
    },
    {
      year: 1,
      semester: 2,
      sections: [
        { sectionName: "A", studentCount: 48 }
      ]
    },
    {
      year: 2,
      semester: 1,
      sections: [] // No sections for Year 2 Sem 1
    }
  ]
}
```

## Frontend Changes

### 1. CreateCourseModal (`frontend/src/components/Modals/CreateCourseModal.jsx`)

**Changes:**
- Changed from `sections` state to `yearSemesterSections` state
- Added `addYearSemester()`, `removeYearSemester()`, `updateYearSemester()` functions
- Updated `addSection()`, `removeSection()`, `updateSection()` to work with nested structure
- New UI with year-semester cards containing sections

**UI Structure:**
```
Year & Semester Sections
  ├─ [Add Year-Semester Button]
  └─ Year-Semester Card 1
      ├─ Year Dropdown (1-4)
      ├─ Semester Dropdown (1-2)
      ├─ [Remove Year-Semester Button]
      └─ Sections
          ├─ [Add Section Button]
          └─ Section Rows
              ├─ Section Name Input
              ├─ Student Count Input
              └─ [Remove Section Button]
```

### 2. EditCourseModal (`frontend/src/components/Modals/EditCourseModal.jsx`)

**Changes:**
- Same structure as CreateCourseModal
- Loads existing `yearSemesterSections` from course data
- Updates course with new year-semester sections structure

### 3. StudentFeedbackSubmission (`frontend/src/pages/StudentFeedbackSubmission.jsx`)

**Changes:**
- Added `availableSections` state
- Added `useEffect` to filter sections based on selected year and semester
- Section dropdown now:
  - Disabled until year AND semester are selected
  - Shows only sections for the selected year-semester combination
  - Shows helpful message: "No sections for Year X Semester Y" if none exist
  - Required only if sections exist for that year-semester

**Logic:**
```javascript
useEffect(() => {
  if (selectedCourse && watchedYear && watchedSemester) {
    const yearSemData = selectedCourse.yearSemesterSections?.find(
      ys => ys.year === parseInt(watchedYear) && ys.semester === parseInt(watchedSemester)
    );
    setAvailableSections(yearSemData?.sections || []);
  } else {
    setAvailableSections([]);
  }
}, [selectedCourse, watchedYear, watchedSemester]);
```

### 4. ResponseAnalytics (`frontend/src/pages/ResponseAnalytics.jsx`)

**Changes:**
- Section dropdown now filters based on selected year and semester
- Disabled until course, year, AND semester are selected
- Dynamically shows sections for the selected year-semester combination

**Logic:**
```javascript
{filters.course && filters.year && filters.semester && (() => {
  const course = courses.find(c => c._id === filters.course);
  const yearSemData = course?.yearSemesterSections?.find(
    ys => ys.year === parseInt(filters.year) && ys.semester === parseInt(filters.semester)
  );
  return yearSemData?.sections?.map(section => (
    <option key={section._id} value={section._id}>Section {section.sectionName}</option>
  ));
})()}
```

## Backend Changes

### Export Comprehensive Analytics (`backend/controllers/responseController.js`)

**Changes:**
- Updated section name lookup to use year-semester specific sections
- Finds section name by matching year and semester first, then finding section within that combination

**Logic:**
```javascript
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
```

## User Experience

### For Admin (Course Creation/Editing)

1. **Create Course**:
   - Enter course name and code
   - Click "Add Year-Semester" to add a year-semester combination
   - Select year (1-4) and semester (1-2)
   - Click "Add Section" within that year-semester to add sections
   - Can add multiple year-semester combinations
   - Can have different sections for each combination

2. **Edit Course**:
   - Existing year-semester sections are loaded
   - Can add/remove year-semester combinations
   - Can add/remove sections within each combination

### For Students (Feedback Submission)

1. Select course
2. Select year
3. Select semester
4. **Section dropdown activates** (if sections exist for that year-semester)
   - Shows only relevant sections
   - Required if sections exist
   - Optional if no sections exist

### For Admin (Analytics)

1. Select form
2. Select course (optional)
3. Select year (optional)
4. Select semester (optional)
5. **Section dropdown activates** (if year and semester selected)
   - Shows only sections for that year-semester
   - Filters analytics by section

## Benefits

✅ **Accurate**: Sections are tied to specific year-semester combinations
✅ **Flexible**: Different years can have different section configurations
✅ **User-Friendly**: Clear UI showing year-semester grouping
✅ **No Confusion**: Students only see sections relevant to their year-semester
✅ **Better Analytics**: Section filtering works correctly with year-semester context
✅ **Backward Compatible**: Courses without sections continue to work normally

## Migration Notes

**Existing Data**: Courses with old `sections` field will need migration:
- Old: `sections: [{ sectionName: "A" }]`
- New: `yearSemesterSections: []` (empty, admin needs to add year-semester specific sections)

**Migration Script** (if needed):
```javascript
// This would convert old sections to Year 1 Semester 1 sections
db.courses.updateMany(
  { sections: { $exists: true, $ne: [] } },
  {
    $set: {
      yearSemesterSections: [{
        year: 1,
        semester: 1,
        sections: "$sections"
      }]
    },
    $unset: { sections: "" }
  }
);
```

## Testing Checklist

- [ ] Create course with year-semester sections
- [ ] Create course without any sections
- [ ] Edit course to add year-semester sections
- [ ] Edit course to remove year-semester sections
- [ ] Submit feedback for course with sections (should require section selection)
- [ ] Submit feedback for course without sections (should work normally)
- [ ] Submit feedback for year-semester with sections
- [ ] Submit feedback for year-semester without sections
- [ ] Filter analytics by section (should show correct sections based on year-semester)
- [ ] Export analytics (should show correct section names)
- [ ] Verify section names appear correctly in Excel export

## Files Modified

### Backend
1. `backend/models/Course.js` - Updated schema
2. `backend/controllers/responseController.js` - Updated export function

### Frontend
3. `frontend/src/components/Modals/CreateCourseModal.jsx` - New UI and logic
4. `frontend/src/components/Modals/EditCourseModal.jsx` - New UI and logic
5. `frontend/src/pages/StudentFeedbackSubmission.jsx` - Dynamic section filtering
6. `frontend/src/pages/ResponseAnalytics.jsx` - Dynamic section filtering

## Summary

The system now correctly handles sections at the year-semester level, providing:
- **Flexibility** for different section configurations per year-semester
- **Accuracy** in section selection and filtering
- **Better UX** with contextual section dropdowns
- **Correct analytics** with proper section filtering
