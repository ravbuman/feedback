import { useState, useEffect } from 'react';
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
  Book,
  ClipboardList,
  ArrowRightIcon
} from 'lucide-react';
import { responseAPI } from '../services/api';
import CreateFacultyModal from '../components/Modals/CreateFacultyModal';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalResponses: 0,
    recentSubmissions: 0,
    totalCourses: 0,
    totalFaculty: 0,
    totalSubjects: 0,
    totalFeedbackForms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const [showFacultyModal, setShowFacultyModal] = useState(false);

  useEffect(() => {
    fetchStats();

    // Listen for deletion events
    const handleSubjectDeleted = () => {
      fetchStats();
    };

    const handleFacultyDeleted = () => {
      fetchStats();
    };

    window.addEventListener('subjectDeleted', handleSubjectDeleted);
    window.addEventListener('facultyDeleted', handleFacultyDeleted);

    return () => {
      window.removeEventListener('subjectDeleted', handleSubjectDeleted);
      window.removeEventListener('facultyDeleted', handleFacultyDeleted);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await responseAPI.getStats();
      console.log(response.data)
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const colorMap = {
    'bg-blue-500': 'rgba(59, 130, 246, 0.2)',
    'bg-green-500': 'rgba(34, 197, 94, 0.2)',
    'bg-purple-500': 'rgba(168, 85, 247, 0.2)',
    'bg-orange-500': 'rgba(249, 115, 22, 0.2)',
    'bg-indigo-500': 'rgba(99, 102, 241, 0.2)',
  };

  const borderColorMap = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
    'bg-indigo-500': '#6366f1',
  };

  const quickActions = [

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
      title: 'Manage Faculty',
      description: 'View, add, edit, and delete faculty members',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => {
        window.location.href = '/admin/faculty';
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
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Faculty Members',
      value: stats.totalFaculty,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      name: 'Total Subjects',
      value: stats.totalSubjects,
      icon: Book,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Feedback Forms',
      value: stats.totalFeedbackForms,
      icon: ClipboardList,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  const handleCreate = (type) => {
    toast.success(`${type} creation feature will be implemented soon!`);
    setShowCreateModal(false);
    setActiveModal('');
  };

  const handleFacultySuccess = (faculty) => {
    fetchStats();
    toast.success(`Faculty ${faculty.name} created successfully!`);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Header */}
      <div className="rounded-2xl p-6 pb-0 sm:p-6">
        <div className="">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Welcome to Admin Dashboard</h2>
          <p className="text-sm sm:text-gray-600">Manage your feedback forms and responses along with the stats</p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 p-2 sm:p-3 rounded-lg ${stat.bgColor}`}
                >
                  <stat.icon
                    className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color}`}
                  />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-[10px] sm:text-sm font-medium text-gray-500">
                    {stat.name}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>


        {/* Actions */}
        <div className="bg-none shadow-none border:none p-none sm:bg-white rounded-2xl sm:shadow-lg sm:p-6 sm:border sm:border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Actions</h2>
            <p className="text-sm text-gray-600">Manage your system with these actions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border hover:shadow-lg transition-all duration-200 text-left card-hover-effect relative overflow-hidden"
                style={{ '--hover-color': colorMap[action.color], borderColor: 'bg-gray-600' }}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div className="flex items-center mb-2 sm:mb-4">
                    <div
                      className={`p-2 sm:p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform duration-200`}
                    >
                      <action.icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>

                    {/* Desktop Plus Icon */}
                    <Plus
                      className="hidden sm:block h-4 w-4 text-gray-400 ml-auto group-hover:text-[color:var(--hover-color)] transition-colors"
                      style={{ '--hover-color': borderColorMap[action.color] }}
                    />

                    {/* Mobile Arrow Icon */}
                    <ArrowRightIcon
                      className="block sm:hidden h-5 w-5 text-gray-400 ml-auto group-hover:text-[color:var(--hover-color)] transition-colors"
                      style={{ '--hover-color': borderColorMap[action.color] }}
                    />
                  </div>

                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{action.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{action.description}</p>
                </div>

                {/* Optional: subtle shimmer effect on mobile */}
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-20 transition-opacity rounded-xl pointer-events-none"></span>
              </button>

            ))}
          </div>
        </div>
      </main>

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