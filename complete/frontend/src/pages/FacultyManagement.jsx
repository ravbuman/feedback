import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Building,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { adminAPI } from '../services/api';
import CreateFacultyModal from '../components/Modals/CreateFacultyModal';
import EditFacultyModal from '../components/Modals/EditFacultyModal';
import DeleteConfirmModal from '../components/Modals/DeleteConfirmModal';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';


const FacultyManagement = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getFaculty();
      setFaculty(response.data);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      toast.error('Failed to fetch faculty data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newFaculty) => {
    setFaculty(prev => [newFaculty, ...prev]);
    toast.success('Faculty created successfully!');
  };

  const handleEditSuccess = (updatedFaculty) => {
    setFaculty(prev =>
      prev.map(f => f._id === updatedFaculty._id ? updatedFaculty : f)
    );
    toast.success('Faculty updated successfully!');
  };

  const handleDeleteSuccess = () => {
    setFaculty(prev => prev.filter(f => f._id !== selectedFaculty._id));
    toast.success('Faculty deleted successfully!');
  };

  const handleEdit = (faculty) => {
    setSelectedFaculty(faculty);
    setShowEditModal(true);
  };

  const handleDelete = (faculty) => {
    setSelectedFaculty(faculty);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteFaculty(selectedFaculty._id);
      handleDeleteSuccess();
      setShowDeleteModal(false);
      setSelectedFaculty(null);
    } catch (error) {
      console.error('Error deleting faculty:', error);
      toast.error('Failed to delete faculty');
    }
  };

  // Filter and search faculty
  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.phoneNumber.includes(searchTerm) ||
      f.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || f.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments for filter
  const departments = [...new Set(faculty.map(f => f.department))].sort();

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Faculty Management</h1>
            <p className="text-sm md:text-base text-gray-600">Manage faculty members and their information</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary md:btn-lg w-full md:w-auto"
        >
          <Plus className="h-5 w-5 md:h-5 md:w-5 mr-2" />
          Add Faculty
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search faculty by name, phone, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input pl-12"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Faculty List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {filteredFaculty.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No faculty found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterDepartment
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new faculty member.'
              }
            </p>
            {!searchTerm && !filterDepartment && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Faculty
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
                    Faculty Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFaculty.map((faculty) => (
                  <tr key={faculty._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-royal-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-royal-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {faculty.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {faculty._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {faculty.phoneNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                        {faculty.designation}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        {faculty.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {faculty.subjects?.length || 0} subjects
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(faculty)}
                          className="text-royal-600 hover:text-royal-900 p-1 rounded-md hover:bg-royal-50 transition-colors"
                          title="Edit faculty"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(faculty)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete faculty"
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
              <Users className="h-6 w-6 text-royal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{faculty.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Building className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{faculty.filter(f => f.isActive !== false).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateFacultyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditFacultyModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        faculty={selectedFaculty}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Faculty"
        message={`Are you sure you want to delete ${selectedFaculty?.name}? This action cannot be undone.`}
        confirmText="Delete Faculty"
        loading={false}
      />
    </div>
  );
};

export default FacultyManagement;