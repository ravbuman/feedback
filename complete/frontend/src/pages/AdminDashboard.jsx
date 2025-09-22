import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Plus,
  UserPlus,
  BookPlus,
  FilePlus,
  Link as LinkIcon,
  TrendingUp,
} from 'lucide-react';
import { responseAPI } from '../services/api';
import CreateFacultyModal from '../components/Modals/CreateFacultyModal';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalResponses: 0,
    recentSubmissions: 0,
    courseStats: [],
    facultyStats: [],
    subjectStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const [showFacultyModal, setShowFacultyModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await responseAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    {
      title: 'Manage Faculty',
      description: 'View, add, edit, and delete faculty members',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => {
        window.location.href = '/admin/faculty';
      }
    },
    {
      title: 'Manage Courses',
      description: 'View, add, edit, and delete courses',
      icon: BookPlus,
      color: 'bg-green-500',
      action: () => {
        window.location.href = '/admin/courses';
      }
    },
    {
      title: 'Manage Subjects',
      description: 'View, add, edit, and delete subjects',
      icon: FilePlus,
      color: 'bg-purple-500',
      action: () => {
        window.location.href = '/admin/subjects';
      }
    },
    {
      title: 'Assign Faculty',
      description: 'Assign faculty to subjects',
      icon: LinkIcon,
      color: 'bg-orange-500',
      action: () => {
        window.location.href = '/admin/assign-faculty';
      }
    },
    {
      title: 'Manage Feedback Forms',
      description: 'Create and manage custom feedback forms',
      icon: FileText,
      color: 'bg-indigo-500',
      action: () => {
        window.location.href = '/admin/feedback-forms';
      }
    },
    {
      title: 'Response Analytics',
      description: 'View and analyze feedback responses',
      icon: BarChart3,
      color: 'bg-purple-500',
      action: () => {
        window.location.href = '/admin/analytics';
      }
    }
  ];

  const statCards = [
    {
      name: 'Total Responses',
      value: stats.totalResponses,
      icon: BarChart3,
      color: 'text-royal-600',
      bgColor: 'bg-royal-100',
    },
    {
      name: 'Recent Submissions',
      value: stats.recentSubmissions,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Active Courses',
      value: stats.courseStats.length,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Faculty Members',
      value: stats.facultyStats.length,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const handleCreate = (type) => {
    toast.success(`${type} creation feature will be implemented soon!`);
    setShowCreateModal(false);
    setActiveModal('');
  };

  const handleFacultySuccess = (faculty) => {
    // Refresh stats after successful faculty creation
    fetchStats();
    toast.success(`Faculty ${faculty.name} created successfully!`);
  };

  const fetchStats = async () => {
    try {
      const response = await responseAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-royal-600 to-royal-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="mt-2 text-royal-100 text-lg">
              Welcome back! Manage your feedback system efficiently.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalResponses}</div>
                <div className="text-sm text-royal-100">Total Responses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600">Manage your system with these quick actions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-royal-300 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <Plus className="h-4 w-4 text-gray-400 ml-auto group-hover:text-royal-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Courses */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Courses</h3>
          <div className="space-y-4">
            {stats.courseStats.slice(0, 5).map((course, index) => (
              <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-royal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-royal-600">{index + 1}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{course.courseName}</p>
                    <p className="text-xs text-gray-500">{course.courseCode}</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-royal-600">{course.count} responses</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Faculty */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Faculty</h3>
          <div className="space-y-4">
            {stats.facultyStats.slice(0, 5).map((faculty, index) => (
              <div key={faculty._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">{index + 1}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{faculty.facultyName}</p>
                    <p className="text-xs text-gray-500">{faculty.designation}</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-green-600">{faculty.count} responses</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-royal-100 mb-4">
                <Plus className="h-6 w-6 text-royal-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Create {activeModal.charAt(0).toUpperCase() + activeModal.slice(1)}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                This feature will be implemented in the next phase.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreate(activeModal)}
                  className="btn btn-primary flex-1"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Creation Modal */}
      <CreateFacultyModal
        isOpen={showFacultyModal}
        onClose={() => setShowFacultyModal(false)}
        onSuccess={handleFacultySuccess}
      />
    </div>
  );
};

export default AdminDashboard;
