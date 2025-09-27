import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Search, BookOpen, Code, Edit2, GraduationCap } from 'lucide-react';
import CreateCourseModal from '../components/Modals/CreateCourseModal';
import EditCourseModal from '../components/Modals/EditCourseModal';
import DeleteConfirmationModal from '../components/Modals/DeleteConfirmModal';
import Loader from '../components/Loader';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCourses();
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newCourse) => {
    setCourses(prev => [newCourse, ...prev]);
    toast.success('Course created successfully!');
  };

  const handleEditSuccess = (updatedCourse) => {
    setCourses(prev =>
      prev.map(c => c._id === updatedCourse._id ? updatedCourse : c)
    );
    toast.success('Course updated successfully!');
  };

  const handleDeleteSuccess = () => {
    setCourses(prev => prev.filter(c => c._id !== selectedCourse._id));
    toast.success('Course deleted successfully!');
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setShowEditModal(true);
  };

  const handleDelete = (course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteCourse(selectedCourse._id);
      handleDeleteSuccess();
      setShowDeleteModal(false);
      setSelectedCourse(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  // Filter and search courses
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
            <p className="text-gray-600">Manage courses and their information</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Course
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding a new course.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
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
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-royal-100 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-royal-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {course.courseName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {course._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Code className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-mono font-medium">{course.courseCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${course.isActive !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {course.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(course)}
                          className="text-royal-600 hover:text-royal-900 p-1 rounded-md hover:bg-royal-50 transition-colors"
                          title="Edit course"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(course)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete course"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-royal-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-royal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.filter(c => c.isActive !== false).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Code className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Codes</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditCourseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        course={selectedCourse}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${selectedCourse?.courseName}" (${selectedCourse?.courseCode})? This action cannot be undone.`}
        confirmText="Delete Course"
        loading={false}
      />
    </div>
  );
};

export default CourseManagement;