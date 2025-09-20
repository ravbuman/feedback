import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, BookOpen, GraduationCap, User, Calendar, Hash, Loader2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateSubjectModal = ({ isOpen, onClose, onSuccess, courses, faculty }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const selectedCourse = watch('course');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await adminAPI.createSubject(data);
      toast.success('Subject created successfully!');
      reset();
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
    onClose();
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

          {/* Faculty Selection */}
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
              You can assign faculty later using the edit option
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
