import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  GraduationCap,
  User,
  Calendar,
  Hash,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import CreateSubjectModal from '../components/Modals/CreateSubjectModal';
import EditSubjectModal from '../components/Modals/EditSubjectModal';
import DeleteConfirmationModal from '../components/Modals/DeleteConfirmModal';
import Loader from '../components/Loader';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, coursesRes, facultyRes] = await Promise.all([
        adminAPI.getSubjects(),
        adminAPI.getCourses(),
        adminAPI.getFaculty()
      ]);


      setSubjects(subjectsRes.data);
      setCourses(coursesRes.data);
      setFaculty(facultyRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newSubject) => {
    setSubjects(prev => [newSubject, ...prev]);
    toast.success('Subject created successfully!');
  };

  const handleEditSuccess = (updatedSubject) => {
    setSubjects(prev =>
      prev.map(s => s._id === updatedSubject._id ? updatedSubject : s)
    );
    toast.success('Subject updated successfully!');
  };

  const handleDeleteSuccess = () => {
    setSubjects(prev => prev.filter(s => s._id !== selectedSubject._id));
    toast.success('Subject deleted successfully!');
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('subjectDeleted', { 
      detail: { subjectId: selectedSubject._id } 
    }));
  };

  const handleEdit = (subject) => {
    setSelectedSubject(subject);
    setShowEditModal(true);
  };

  const handleDelete = (subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteSubject(selectedSubject._id);
      handleDeleteSuccess();
      setShowDeleteModal(false);
      setSelectedSubject(null);
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  // Helper function to get course name
  const getCourseName = (course) => {
    if (typeof course === 'object' && course.courseName) {
      return course.courseName;
    }
    // Fallback to lookup if course is just an ID
    const courseObj = courses.find(c => c._id === course);
    return courseObj ? courseObj.courseName : 'Unknown Course';
  };

  // Helper function to get faculty name or section assignments
  const getFacultyDisplay = (subject) => {
    // Debug log
    console.log(`Subject: ${subject.subjectName}, sectionFaculty:`, subject.sectionFaculty);
    
    // Check if there are section-specific faculty assignments
    if (subject.sectionFaculty && subject.sectionFaculty.length > 0) {
      const sectionCount = subject.sectionFaculty.length;
      return `${sectionCount} Section${sectionCount > 1 ? 's' : ''} Assigned`;
    }
    
    // Otherwise check default faculty
    if (!subject.faculty) return 'Not Assigned';
    if (typeof subject.faculty === 'object' && subject.faculty.name) {
      return subject.faculty.name;
    }
    return 'Unknown Faculty';
  };

  // Helper function for search (checks both default faculty and section faculty)
  const getFacultyNameForSearch = (subject) => {
    if (subject.sectionFaculty && subject.sectionFaculty.length > 0) {
      // Return all faculty names from section assignments for search
      return subject.sectionFaculty
        .map(sf => sf.faculty?.name || '')
        .filter(name => name)
        .join(' ');
    }
    if (subject.faculty && typeof subject.faculty === 'object' && subject.faculty.name) {
      return subject.faculty.name;
    }
    return '';
  };

  // Filter and search subjects
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCourseName(s.course).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getFacultyNameForSearch(s).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Subject Management</h1>
            <p className="text-sm md:text-base text-gray-600">Manage subjects, their courses, and assigned faculty</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary md:btn-lg w-full md:w-auto"
        >
          <Plus className="h-5 w-5 md:h-5 md:w-5 mr-2" />
          Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects by name, course, or faculty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subjects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding a new subject.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year/Sem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubjects.map((subject) => (
                  <tr key={subject._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {subject.subjectName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {subject._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{getCourseName(subject.course)}</span>
                        {typeof subject.course === 'object' && subject.course.courseCode && (
                          <span className="ml-2 text-xs text-gray-500">({subject.course.courseCode})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Year {subject.year}, Sem {subject.semester}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        <User className={`h-4 w-4 mr-2 ${(subject.faculty || (subject.sectionFaculty && subject.sectionFaculty.length > 0)) ? 'text-gray-400' : 'text-orange-400'}`} />
                        <div>
                          <div className={(subject.faculty || (subject.sectionFaculty && subject.sectionFaculty.length > 0)) ? 'text-gray-900' : 'text-orange-600 font-medium'}>
                            {getFacultyDisplay(subject)}
                          </div>
                          {typeof subject.faculty === 'object' && subject.faculty.designation && (
                            <div className="text-xs text-gray-500">
                              {subject.faculty.designation} - {subject.faculty.department}
                            </div>
                          )}
                          {subject.sectionFaculty && subject.sectionFaculty.length > 0 && (
                            <div className="text-xs text-blue-600">
                              Section-wise assignments
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.isActive !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {subject.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="text-royal-600 hover:text-royal-900 p-1 rounded-md hover:bg-royal-50 transition-colors"
                          title="Edit subject"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete subject"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{subjects.filter(s => s.isActive !== false).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Hash className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Courses</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(subjects.map(s => s.course)).size}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faculty Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(subjects.filter(s => s.faculty).map(s => s.faculty)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateSubjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        courses={courses}
        faculty={faculty}
      />

      <EditSubjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        subject={selectedSubject}
        courses={courses}
        faculty={faculty}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${selectedSubject?.subjectName}"? This action cannot be undone.`}
        confirmText="Delete Subject"
        loading={false}
      />
    </div>
  );
};

export default SubjectManagement;