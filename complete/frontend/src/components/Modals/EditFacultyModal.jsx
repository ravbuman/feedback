import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Phone, Briefcase, Building, Loader2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { checkPhoneNumberExists, validatePhoneNumber } from '../../utils/validation';
import toast from 'react-hot-toast';

const EditFacultyModal = ({ isOpen, onClose, onSuccess, faculty }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors
  } = useForm();

  useEffect(() => {
    if (faculty && isOpen) {
      setValue('name', faculty.name || '');
      setValue('phoneNumber', faculty.phoneNumber || '');
      setValue('designation', faculty.designation || '');
      setValue('department', faculty.department || '');
    }
  }, [faculty, isOpen, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Check if phone number already exists (excluding current faculty)
      if (data.phoneNumber !== faculty.phoneNumber) {
        const phoneExists = await checkPhoneNumberExists(data.phoneNumber, faculty._id);
        if (phoneExists) {
          setError('phoneNumber', {
            type: 'manual',
            message: 'Phone number already exists. Please use a different phone number.'
          });
          setLoading(false);
          return;
        }
      }

      // Handle custom designation and department
      const payload = { ...data };
      if (data.designation === 'Other' && data.customDesignation) {
        payload.designation = data.customDesignation;
      }
      if (data.department === 'Other' && data.customDepartment) {
        payload.department = data.customDepartment;
      }

      const response = await adminAPI.updateFaculty(faculty._id, payload);
      toast.success('Faculty updated successfully!');
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating faculty:', error);
      if (error.response?.data?.message?.includes('Phone number already exists')) {
        setError('phoneNumber', {
          type: 'manual',
          message: 'Phone number already exists. Please use a different phone number.'
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to update faculty');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !faculty) return null;

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
              <h3 className="text-xl font-bold text-gray-900">Edit Faculty</h3>
              <p className="text-sm text-gray-500">Update faculty member information</p>
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
              Phone Number *
            </label>
            <input
              type="tel"
              {...register('phoneNumber', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^[0-9+\-\s()]+$/,
                  message: 'Please enter a valid phone number'
                },
                validate: async (value) => {
                  if (!value) return true; // Let required validation handle empty values
                  if (!validatePhoneNumber(value)) {
                    return 'Please enter a valid phone number';
                  }
                  // Only check uniqueness if phone number has changed
                  if (value !== faculty?.phoneNumber) {
                    const exists = await checkPhoneNumberExists(value, faculty?._id);
                    return exists ? 'Phone number already exists' : true;
                  }
                  return true;
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
            >
              <option value="">Select department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="English">English</option>
              <option value="Management Studies">Management Studies</option>
              <option value="Commerce">Commerce</option>
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
                  Updating...
                </>
              ) : (
                'Update Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFacultyModal;
