import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, BookOpen, Code, Loader2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { checkCourseCodeExists } from '../../utils/validation';
import toast from 'react-hot-toast';

const EditCourseModal = ({ isOpen, onClose, onSuccess, course }) => {
  const [loading, setLoading] = useState(false);
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

      const response = await adminAPI.updateCourse(course._id, data);
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
    onClose();
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
