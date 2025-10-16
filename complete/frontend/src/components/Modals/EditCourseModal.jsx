import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, BookOpen, Code, Loader2, Plus, Trash2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { checkCourseCodeExists } from '../../utils/validation';
import toast from 'react-hot-toast';

const EditCourseModal = ({ isOpen, onClose, onSuccess, course }) => {
  const [loading, setLoading] = useState(false);
  const [yearSemesterSections, setYearSemesterSections] = useState([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError,
    clearErrors
  } = useForm();

  useEffect(() => {
    if (course && isOpen) {
      setValue('courseName', course.courseName || '');
      setValue('courseCode', course.courseCode || '');
      setYearSemesterSections(course.yearSemesterSections || []);
    }
  }, [course, isOpen, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Check if course code already exists (excluding current course)
      if (data.courseCode !== course.courseCode) {
        const codeExists = await checkCourseCodeExists(data.courseCode, course._id);
        if (codeExists) {
          setError('courseCode', {
            type: 'manual',
            message: 'Course code already exists. Please use a different course code.'
          });
          setLoading(false);
          return;
        }
      }

      // Add year-semester sections to the data
      const courseData = {
        ...data,
        yearSemesterSections: yearSemesterSections.map(ys => ({
          year: ys.year,
          semester: ys.semester,
          sections: ys.sections.filter(s => s.sectionName.trim() !== '')
        })).filter(ys => ys.sections.length > 0)
      };

      const response = await adminAPI.updateCourse(course._id, courseData);
      toast.success('Course updated successfully!');
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating course:', error);
      if (error.response?.data?.message?.includes('Course code already exists')) {
        setError('courseCode', {
          type: 'manual',
          message: 'Course code already exists. Please use a different course code.'
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to update course');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setYearSemesterSections([]);
    onClose();
  };

  const addYearSemester = () => {
    setYearSemesterSections([...yearSemesterSections, { year: 1, semester: 1, sections: [] }]);
  };

  const removeYearSemester = (index) => {
    setYearSemesterSections(yearSemesterSections.filter((_, i) => i !== index));
  };

  const updateYearSemester = (index, field, value) => {
    const updated = [...yearSemesterSections];
    updated[index][field] = parseInt(value);
    setYearSemesterSections(updated);
  };

  const addSection = (ysIndex) => {
    const updated = [...yearSemesterSections];
    updated[ysIndex].sections.push({ sectionName: '', studentCount: '' });
    setYearSemesterSections(updated);
  };

  const removeSection = (ysIndex, sectionIndex) => {
    const updated = [...yearSemesterSections];
    updated[ysIndex].sections = updated[ysIndex].sections.filter((_, i) => i !== sectionIndex);
    setYearSemesterSections(updated);
  };

  const updateSection = (ysIndex, sectionIndex, field, value) => {
    const updated = [...yearSemesterSections];
    updated[ysIndex].sections[sectionIndex][field] = value;
    setYearSemesterSections(updated);
  };

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Course</h3>
              <p className="text-sm text-gray-500">Update course information</p>
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
          {/* Course Name */}
          <div>
            <label className="label flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
              Course Name *
            </label>
            <input
              type="text"
              {...register('courseName', { 
                required: 'Course name is required',
                minLength: { value: 2, message: 'Course name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Course name must be less than 100 characters' }
              })}
              className={`input ${errors.courseName ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter course name"
            />
            {errors.courseName && (
              <p className="mt-1 text-sm text-red-600">{errors.courseName.message}</p>
            )}
          </div>

          {/* Course Code */}
          <div>
            <label className="label flex items-center">
              <Code className="h-4 w-4 mr-2 text-gray-500" />
              Course Code *
            </label>
            <input
              type="text"
              {...register('courseCode', { 
                required: 'Course code is required',
                minLength: { value: 2, message: 'Course code must be at least 2 characters' },
                maxLength: { value: 20, message: 'Course code must be less than 20 characters' },
                pattern: {
                  value: /^[A-Z0-9]+$/,
                  message: 'Course code must contain only uppercase letters and numbers'
                },
                validate: async (value) => {
                  if (!value) return true; // Let required validation handle empty values
                  // Only check uniqueness if course code has changed
                  if (value !== course?.courseCode) {
                    const exists = await checkCourseCodeExists(value, course?._id);
                    return exists ? 'Course code already exists' : true;
                  }
                  return true;
                }
              })}
              className={`input ${errors.courseCode ? 'border-red-300 focus:ring-red-500' : ''} font-mono`}
              placeholder="Enter course code (e.g., CS101)"
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                // Convert to uppercase as user types
                e.target.value = e.target.value.toUpperCase();
                // Clear errors when user starts typing
                if (errors.courseCode) {
                  clearErrors('courseCode');
                }
              }}
            />
            {errors.courseCode && (
              <p className="mt-1 text-sm text-red-600">{errors.courseCode.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Course code will be automatically converted to uppercase
            </p>
          </div>

          {/* Year-Semester Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label">Year & Semester Sections (Optional)</label>
              <button
                type="button"
                onClick={addYearSemester}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Year-Semester
              </button>
            </div>
            {yearSemesterSections.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No year-semester sections added. Click "Add Year-Semester" to create sections for specific years and semesters.</p>
            ) : (
              <div className="space-y-4">
                {yearSemesterSections.map((ys, ysIndex) => (
                  <div key={ysIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2 items-center flex-1">
                        <select
                          value={ys.year}
                          onChange={(e) => updateYearSemester(ysIndex, 'year', e.target.value)}
                          className="input text-sm flex-1"
                        >
                          <option value={1}>Year 1</option>
                          <option value={2}>Year 2</option>
                          <option value={3}>Year 3</option>
                          <option value={4}>Year 4</option>
                        </select>
                        <select
                          value={ys.semester}
                          onChange={(e) => updateYearSemester(ysIndex, 'semester', e.target.value)}
                          className="input text-sm flex-1"
                        >
                          <option value={1}>Semester 1</option>
                          <option value={2}>Semester 2</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeYearSemester(ysIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">Sections</span>
                        <button
                          type="button"
                          onClick={() => addSection(ysIndex)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add Section
                        </button>
                      </div>
                      {ys.sections.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No sections</p>
                      ) : (
                        <div className="space-y-2">
                          {ys.sections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="flex gap-2 items-start">
                              <input
                                type="text"
                                value={section.sectionName}
                                onChange={(e) => updateSection(ysIndex, sectionIndex, 'sectionName', e.target.value)}
                                className="input text-xs flex-1"
                                placeholder="Section (e.g., A)"
                              />
                              <input
                                type="number"
                                value={section.studentCount || ''}
                                onChange={(e) => updateSection(ysIndex, sectionIndex, 'studentCount', e.target.value)}
                                className="input text-xs flex-1"
                                placeholder="Count"
                                min="0"
                              />
                              <button
                                type="button"
                                onClick={() => removeSection(ysIndex, sectionIndex)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Add sections for specific year and semester combinations. For example, Year 1 Semester 1 might have sections A, B, C.
            </p>
          </div>

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
                  Updating...
                </>
              ) : (
                'Update Course'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourseModal;
