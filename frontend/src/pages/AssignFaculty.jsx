import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Users, 
  BookOpen, 
  GraduationCap,
  Loader2,
  AlertTriangle,
  User,
  Calendar,
  Hash
} from 'lucide-react';
import { adminAPI } from '../services/api';
import AssignFacultyModal from '../components/Modals/AssignFacultyModal';
import toast from 'react-hot-toast';

const AssignFaculty = () => {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, assigned, unassigned
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, facultyRes, coursesRes] = await Promise.all([
        adminAPI.getSubjects(),
        adminAPI.getFaculty(),
        adminAPI.getCourses()
      ]);
      
      setSubjects(subjectsRes.data);
      setFaculty(facultyRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSuccess = (updatedSubject) => {
    setSubjects(prev => 
      prev.map(s => s._id === updatedSubject._id ? updatedSubject : s)
    );
    toast.success('Faculty assigned successfully!');
  };

  const handleAssign = (subject) => {
    setSelectedSubject(subject);
    setShowAssignModal(true);
  };

  // Helper function to get course name
  const getCourseName = (course) => {
    if (typeof course === 'object' && course.courseName) {
      return course.courseName;
    }
    const courseObj = courses.find(c => c._id === course);
    return courseObj ? courseObj.courseName : 'Unknown Course';
  };

  // Helper function to get faculty name
  const getFacultyName = (faculty) => {
    if (!faculty) return 'Not Assigned';
    if (typeof faculty === 'object' && faculty.name) {
      return faculty.name;
    }
    const facultyMember = faculty.find(f => f._id === faculty);
    return facultyMember ? facultyMember.name : 'Unknown Faculty';
  };

  // Filter and search subjects
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCourseName(s.course).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getFacultyName(s.faculty).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'assigned' && s.faculty) ||
                         (filterStatus === 'unassigned' && !s.faculty);
    
    return matchesSearch && matchesFilter;
  });

  const assignedCount = subjects.filter(s => s.faculty).length;
  const unassignedCount = subjects.filter(s => !s.faculty).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assign Faculty</h1>
          <p className="text-gray-600">Assign faculty members to subjects</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-green-600">{assignedCount}</span> assigned • 
            <span className="font-medium text-orange-600 ml-1">{unassignedCount}</span> unassigned
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects by name, course, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Subjects</option>
              <option value="assigned">Assigned Faculty</option>
              <option value="unassigned">Unassigned Faculty</option>
            </select>
          </div>
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
                : 'No subjects match the selected filter.'
              }
            </p>
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
                    Current Faculty
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
                        <User className={`h-4 w-4 mr-2 ${subject.faculty ? 'text-gray-400' : 'text-orange-400'}`} />
                        <div>
                          <div className={subject.faculty ? 'text-gray-900' : 'text-orange-600 font-medium'}>
                            {getFacultyName(subject.faculty)}
                          </div>
                          {typeof subject.faculty === 'object' && subject.faculty.designation && (
                            <div className="text-xs text-gray-500">
                              {subject.faculty.designation} - {subject.faculty.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleAssign(subject)}
                        className={`btn btn-sm ${
                          subject.faculty 
                            ? 'btn-outline' 
                            : 'btn-primary'
                        }`}
                      >
                        {subject.faculty ? (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Reassign
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </>
                        )}
                      </button>
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
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Assigned Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{assignedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <XCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unassigned Faculty</p>
              <p className="text-2xl font-bold text-gray-900">{unassignedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Faculty Modal */}
      <AssignFacultyModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={handleAssignSuccess}
        subject={selectedSubject}
        faculty={faculty}
      />
    </div>
  );
};

export default AssignFaculty;
