import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { X, BookOpen, GraduationCap, User, Calendar, Hash, Loader2, Users, FlaskConical } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateSubjectModal = ({ isOpen, onClose, onSuccess, courses, faculty }) => {
  const [loading, setLoading] = useState(false);
  const [sectionFacultyMap, setSectionFacultyMap] = useState({});
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm();

  const selectedCourse = watch('course');
  const selectedYear = watch('year');
  const selectedSemester = watch('semester');

  // Get sections for selected year-semester
  const availableSections = useMemo(() => {
    if (!selectedCourse || !selectedYear || !selectedSemester) return [];
    const course = courses.find(c => c._id === selectedCourse);
    if (!course) return [];
    const yearSemData = course.yearSemesterSections?.find(
      ys => ys.year === parseInt(selectedYear) && ys.semester === parseInt(selectedSemester)
    );
    return yearSemData?.sections || [];
  }, [selectedCourse, selectedYear, selectedSemester, courses]);

  // Reset section faculty map when sections change
  useEffect(() => {
    if (availableSections.length > 0) {
      const initialMap = {};
      availableSections.forEach(section => {
        initialMap[section._id] = '';
      });
      setSectionFacultyMap(initialMap);
    } else {
      setSectionFacultyMap({});
    }
  }, [availableSections]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data };
      
      // If sections exist, use section-specific faculty
      if (availableSections.length > 0) {
        const sectionFaculty = [];
        Object.entries(sectionFacultyMap).forEach(([sectionId, facultyId]) => {
          if (facultyId) {
            sectionFaculty.push({ section: sectionId, faculty: facultyId });
          }
        });
        
        if (sectionFaculty.length > 0) {
          payload.sectionFaculty = sectionFaculty;
          delete payload.faculty; // Remove default faculty if using section-specific
        }
      }
      // Otherwise, use default faculty field (already in data)
      
      const response = await adminAPI.createSubject(payload);
      toast.success('Subject created successfully!');
      reset();
      setSectionFacultyMap({});
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating subject:', error);
      if (error.response?.data?.message?.includes('already exists')) {
        toast.error('A subject with this name already exists for the selected course, year, and semester combination.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create subject');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSectionFacultyMap({});
    onClose();
  };

  const handleSectionFacultyChange = (sectionId, facultyId) => {
    setSectionFacultyMap(prev => ({
      ...prev,
      [sectionId]: facultyId
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Create Subject</h3>
              <p className="text-sm text-gray-500">Add a new subject to the system</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Subject Name */}
          <div>
            <label className="label flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
              Subject Name *
            </label>
            <input
              type="text"
              {...register('subjectName', { 
                required: 'Subject name is required',
                minLength: { value: 2, message: 'Subject name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Subject name must be less than 100 characters' }
              })}
              className={`input ${errors.subjectName ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter subject name"
            />
            {errors.subjectName && (
              <p className="mt-1 text-sm text-red-600">{errors.subjectName.message}</p>
            )}
          </div>

          {/* Lab Subject Checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              {...register('isLab')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              id="isLab"
            />
            <div className="flex-1">
              <label htmlFor="isLab" className="flex items-center text-sm font-medium text-gray-900 cursor-pointer">
                <FlaskConical className="h-4 w-4 mr-2 text-blue-600" />
                This is a Lab Subject
              </label>
              <p className="mt-1 text-xs text-gray-600">
                For lab subjects, MCQ questions will be treated as text responses to allow descriptive feedback about practical work.
              </p>
            </div>
          </div>

          {/* Course Selection */}
          <div>
            <label className="label flex items-center">
              <GraduationCap className="h-4 w-4 mr-2 text-gray-500" />
              Course *
            </label>
            <select
              {...register('course', { required: 'Course selection is required' })}
              className={`input ${errors.course ? 'border-red-300 focus:ring-red-500' : ''}`}
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
            {errors.course && (
              <p className="mt-1 text-sm text-red-600">{errors.course.message}</p>
            )}
          </div>

          {/* Year and Semester */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center">
                <Hash className="h-4 w-4 mr-2 text-gray-500" />
                Year *
              </label>
              <select
                {...register('year', { 
                  required: 'Year is required',
                  valueAsNumber: true
                })}
                className={`input ${errors.year ? 'border-red-300 focus:ring-red-500' : ''}`}
              >
                <option value="">Select year</option>
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
              {errors.year && (
                <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
              )}
            </div>

            <div>
              <label className="label flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                Semester *
              </label>
              <select
                {...register('semester', { 
                  required: 'Semester is required',
                  valueAsNumber: true
                })}
                className={`input ${errors.semester ? 'border-red-300 focus:ring-red-500' : ''}`}
              >
                <option value="">Select semester</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
                <option value={5}>Semester 5</option>
                <option value={6}>Semester 6</option>
                <option value={7}>Semester 7</option>
                <option value={8}>Semester 8</option>
              </select>
              {errors.semester && (
                <p className="mt-1 text-sm text-red-600">{errors.semester.message}</p>
              )}
            </div>
          </div>

          {/* Faculty Selection - Section-specific or Default */}
          {availableSections.length > 0 ? (
            <div>
              <label className="label flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                Faculty Assignment by Section
              </label>
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {availableSections.map((section) => (
                  <div key={section._id} className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 w-24">
                      Section {section.sectionName}
                    </label>
                    <select
                      value={sectionFacultyMap[section._id] || ''}
                      onChange={(e) => handleSectionFacultyChange(section._id, e.target.value)}
                      className="input flex-1"
                    >
                      <option value="">Select faculty</option>
                      {faculty.map((facultyMember) => (
                        <option key={facultyMember._id} value={facultyMember._id}>
                          {facultyMember.name} - {facultyMember.designation}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Assign different faculty for each section
              </p>
            </div>
          ) : (
            <div>
              <label className="label flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                Faculty (Optional)
              </label>
              <select
                {...register('faculty')}
                className="input"
              >
                <option value="">Select a faculty member (optional)</option>
                {faculty.map((facultyMember) => (
                  <option key={facultyMember._id} value={facultyMember._id}>
                    {facultyMember.name} - {facultyMember.designation} ({facultyMember.department})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This year-semester has no sections. Assign a default faculty.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubjectModal;
