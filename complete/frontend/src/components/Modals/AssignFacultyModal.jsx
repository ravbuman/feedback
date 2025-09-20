import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, UserPlus, User, BookOpen, GraduationCap, Calendar, Loader2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AssignFacultyModal = ({ isOpen, onClose, onSuccess, subject, faculty }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  const selectedFaculty = watch('faculty');

  useEffect(() => {
    if (subject && isOpen) {
      setValue('faculty', subject.faculty?._id || subject.faculty || '');
    }
  }, [subject, isOpen, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await adminAPI.updateSubject(subject._id, {
        faculty: data.faculty || null
      });
      toast.success('Faculty assignment updated successfully!');
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating faculty assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to update faculty assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUnassign = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.updateSubject(subject._id, {
        faculty: null
      });
      toast.success('Faculty unassigned successfully!');
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error unassigning faculty:', error);
      toast.error('Failed to unassign faculty');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !subject) return null;

  const currentFaculty = subject.faculty;
  const selectedFacultyData = faculty.find(f => f._id === selectedFaculty);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Assign Faculty</h3>
              <p className="text-sm text-gray-500">Assign faculty to subject</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Subject Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{subject.subjectName}</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  <span>{typeof subject.course === 'object' ? subject.course.courseName : 'Loading...'}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Year {subject.year}, Sem {subject.semester}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Current Assignment */}
          {currentFaculty && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Current Assignment</h5>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">
                    {typeof currentFaculty === 'object' ? currentFaculty.name : 'Loading...'}
                  </div>
                  {typeof currentFaculty === 'object' && currentFaculty.designation && (
                    <div className="text-sm text-blue-700">
                      {currentFaculty.designation} - {currentFaculty.department}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Faculty Selection */}
          <div>
            <label className="label flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-500" />
              Select Faculty
            </label>
            <select
              {...register('faculty')}
              className="input"
            >
              <option value="">No faculty assigned</option>
              {faculty.map((facultyMember) => (
                <option key={facultyMember._id} value={facultyMember._id}>
                  {facultyMember.name} - {facultyMember.designation} ({facultyMember.department})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a faculty member to assign to this subject, or leave empty to unassign
            </p>
          </div>

          {/* Selected Faculty Preview */}
          {selectedFaculty && selectedFacultyData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-green-900 mb-2">Selected Faculty</h5>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">
                    {selectedFacultyData.name}
                  </div>
                  <div className="text-sm text-green-700">
                    {selectedFacultyData.designation} - {selectedFacultyData.department}
                  </div>
                  {selectedFacultyData.phoneNumber && (
                    <div className="text-xs text-green-600 mt-1">
                      Phone: {selectedFacultyData.phoneNumber}
                    </div>
                  )}
                </div>
              </div>
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
            {currentFaculty && (
              <button
                type="button"
                onClick={handleUnassign}
                className="btn btn-outline btn-red flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  'Unassign Faculty'
                )}
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {currentFaculty ? 'Updating...' : 'Assigning...'}
                </>
              ) : (
                currentFaculty ? 'Update Assignment' : 'Assign Faculty'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFacultyModal;
