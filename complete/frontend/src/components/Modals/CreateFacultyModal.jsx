import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Phone, Briefcase, Building, Loader2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { checkPhoneNumberExists, validatePhoneNumber } from '../../utils/validation';
import toast from 'react-hot-toast';

const CreateFacultyModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
    clearErrors
  } = useForm();

  // Courses for dynamic department dropdown
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        const response = await adminAPI.getCourses();
        const fetched = Array.isArray(response?.data) ? response.data : [];
        // Use unique course names, keep only active courses if flag present (default include all)
        const uniqueNames = [...new Set(
          fetched
            .filter(c => c && (c.isActive !== false))
            .map(c => c.courseName)
            .filter(Boolean)
        )].sort();
        setCourses(uniqueNames);
      } catch (err) {
        console.error('Error fetching courses for department dropdown:', err);
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Check if phone number already exists, only if a phone number is provided
      if (data.phoneNumber) {
        const phoneExists = await checkPhoneNumberExists(data.phoneNumber);
        if (phoneExists) {
          setError('phoneNumber', {
            type: 'manual',
            message: 'Phone number already exists. Please use a different phone number.'
          });
          setLoading(false);
          return;
        }
      }

      const response = await adminAPI.createFaculty(data);
      toast.success('Faculty created successfully!');
      reset();
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating faculty:', error);
      if (error.response?.data?.message?.includes('Phone number already exists')) {
        setError('phoneNumber', {
          type: 'manual',
          message: 'Phone number already exists. Please use a different phone number.'
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to create faculty');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Create Faculty</h3>
              <p className="text-sm text-gray-500">Add a new faculty member to the system</p>
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
          {/* Name */}
          <div>
            <label className="label flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-500" />
              Full Name *
            </label>
            <input
              type="text"
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
              className={`input ${errors.name ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="label flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-500" />
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phoneNumber', {
                pattern: {
                  value: /^[0-9+\-\s()]+$/,
                  message: 'Please enter a valid phone number'
                },
                validate: async (value) => {
                  if (!value) return true; // Not required, so empty is valid
                  if (!validatePhoneNumber(value)) {
                    return 'Please enter a valid phone number';
                  }
                  const exists = await checkPhoneNumberExists(value);
                  return exists ? 'Phone number already exists' : true;
                }
              })}
              className={`input ${errors.phoneNumber ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter phone number"
              onChange={(e) => {
                // Clear errors when user starts typing
                if (errors.phoneNumber) {
                  clearErrors('phoneNumber');
                }
              }}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>

          {/* Designation */}
          <div>
            <label className="label flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
              Designation *
            </label>
            <select
              {...register('designation', { required: 'Designation is required' })}
              className={`input ${errors.designation ? 'border-red-300 focus:ring-red-500' : ''}`}
            >
              <option value="">Select designation</option>
              <option value="Professor">Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Lecturer">Lecturer</option>
              <option value="Senior Lecturer">Senior Lecturer</option>
              <option value="Head of Department">Head of Department</option>
              <option value="Dean">Dean</option>
              <option value="Director">Director</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Other">Other</option>
            </select>
            {errors.designation && (
              <p className="mt-1 text-sm text-red-600">{errors.designation.message}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="label flex items-center">
              <Building className="h-4 w-4 mr-2 text-gray-500" />
              Department *
            </label>
            <select
              {...register('department', { required: 'Department is required' })}
              className={`input ${errors.department ? 'border-red-300 focus:ring-red-500' : ''}`}
              disabled={coursesLoading}
            >
              <option value="">
                {coursesLoading ? 'Loading departments...' : 'Select department'}
              </option>
              {courses.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
            )}
          </div>

          {/* Custom Designation Input (if Other is selected) */}
          {watch('designation') === 'Other' && (
            <div>
              <label className="label">Custom Designation *</label>
              <input
                type="text"
                {...register('customDesignation', {
                  required: watch('designation') === 'Other' ? 'Custom designation is required' : false
                })}
                className={`input ${errors.customDesignation ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter custom designation"
              />
              {errors.customDesignation && (
                <p className="mt-1 text-sm text-red-600">{errors.customDesignation.message}</p>
              )}
            </div>
          )}

          {/* Custom Department Input (if Other is selected) */}
          {watch('department') === 'Other' && (
            <div>
              <label className="label">Custom Department *</label>
              <input
                type="text"
                {...register('customDepartment', {
                  required: watch('department') === 'Other' ? 'Custom department is required' : false
                })}
                className={`input ${errors.customDepartment ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter custom department"
              />
              {errors.customDepartment && (
                <p className="mt-1 text-sm text-red-600">{errors.customDepartment.message}</p>
              )}
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
                'Create Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFacultyModal;
