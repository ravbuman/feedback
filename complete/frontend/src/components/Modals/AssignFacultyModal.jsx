import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, UserPlus, User, BookOpen, GraduationCap, Calendar, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AssignFacultyModal = ({ isOpen, onClose, onSuccess, subject, faculty }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('default'); // 'default' or 'sections'
  const [sections, setSections] = useState([]);
  const [sectionAssignments, setSectionAssignments] = useState([]);
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
      
      // Load sections for this course/year/semester
      fetchSections();
      
      // Load existing section assignments
      if (subject.sectionFaculty && subject.sectionFaculty.length > 0) {
        setSectionAssignments(subject.sectionFaculty.map(sf => ({
          section: sf.section?._id || sf.section,
          sectionName: sf.section?.sectionName || '',
          faculty: sf.faculty?._id || sf.faculty,
          facultyName: sf.faculty?.name || ''
        })));
        setActiveTab('sections'); // Auto-switch to sections tab if assignments exist
      } else {
        setSectionAssignments([]);
      }
    }
  }, [subject, isOpen, setValue]);

  const fetchSections = async () => {
    if (!subject) return;
    try {
      const courseId = subject.course?._id || subject.course;
      const response = await adminAPI.getCourses();
      const course = response.data.find(c => c._id === courseId);
      
      if (course && course.yearSemesterSections) {
        const yearSemData = course.yearSemesterSections.find(
          ys => ys.year === subject.year && ys.semester === subject.semester
        );
        setSections(yearSemData?.sections || []);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let updateData = {};
      
      if (activeTab === 'default') {
        // Update default faculty
        updateData = {
          faculty: data.faculty || null
        };
      } else {
        // Update section assignments
        updateData = {
          sectionFaculty: sectionAssignments.map(sa => ({
            section: sa.section,
            faculty: sa.faculty
          }))
        };
      }
      
      const response = await adminAPI.updateSubject(subject._id, updateData);
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
      let updateData = {};
      
      if (activeTab === 'default') {
        updateData = { faculty: null };
      } else {
        updateData = { sectionFaculty: [] };
      }
      
      const response = await adminAPI.updateSubject(subject._id, updateData);
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

  const addSectionAssignment = () => {
    setSectionAssignments([...sectionAssignments, { section: '', sectionName: '', faculty: '', facultyName: '' }]);
  };

  const removeSectionAssignment = (index) => {
    setSectionAssignments(sectionAssignments.filter((_, i) => i !== index));
  };

  const updateSectionAssignment = (index, field, value) => {
    const updated = [...sectionAssignments];
    updated[index][field] = value;
    
    // Update display names
    if (field === 'section') {
      const section = sections.find(s => s._id === value);
      updated[index].sectionName = section?.sectionName || '';
    }
    if (field === 'faculty') {
      const facultyMember = faculty.find(f => f._id === value);
      updated[index].facultyName = facultyMember?.name || '';
    }
    
    setSectionAssignments(updated);
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('default')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'default'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Default Faculty
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sections')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'sections'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Section Assignments
              {sectionAssignments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {sectionAssignments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Default Faculty Tab */}
          {activeTab === 'default' && (
            <>
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
                  Assign a default faculty for all sections, or use section-specific assignments
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
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Section Assignments Tab */}
          {activeTab === 'sections' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Assign different faculty members to different sections. This overrides the default faculty assignment.
                </p>
              </div>

              {/* Section Assignment List */}
              <div className="space-y-3">
                {sectionAssignments.map((assignment, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                        <select
                          value={assignment.section}
                          onChange={(e) => updateSectionAssignment(index, 'section', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="">Select Section</option>
                          {sections.map((section) => (
                            <option key={section._id} value={section._id}>
                              Section {section.sectionName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Faculty</label>
                        <select
                          value={assignment.faculty}
                          onChange={(e) => updateSectionAssignment(index, 'faculty', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="">Select Faculty</option>
                          {faculty.map((facultyMember) => (
                            <option key={facultyMember._id} value={facultyMember._id}>
                              {facultyMember.name} - {facultyMember.designation}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSectionAssignment(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-6"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Section Button */}
              <button
                type="button"
                onClick={addSectionAssignment}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
                disabled={sections.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section Assignment
              </button>

              {sections.length === 0 && (
                <p className="text-xs text-amber-600 text-center">
                  No sections available for this course/year/semester
                </p>
              )}
            </>
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
            {((activeTab === 'default' && currentFaculty) || (activeTab === 'sections' && sectionAssignments.length > 0)) && (
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
                  activeTab === 'default' ? 'Unassign Faculty' : 'Clear All Sections'
                )}
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || (activeTab === 'sections' && sectionAssignments.length === 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                activeTab === 'default' ? 'Save Default Faculty' : 'Save Section Assignments'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFacultyModal;
