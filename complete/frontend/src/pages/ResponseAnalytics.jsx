import React, { useState, useEffect } from 'react';
import { responseAPI, adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  List,
} from 'lucide-react';
import FacultyAnalytics from '../components/analytics/FacultyAnalytics';
import QuestionFacultyAnalytics from '../components/analytics/QuestionFacultyAnalytics';

const ResponseAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [facultyAnalytics, setFacultyAnalytics] = useState(null);
  const [forms, setForms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFacultyAnalytics, setLoadingFacultyAnalytics] = useState(false);
  const [selectedForm, setSelectedForm] = useState('');
  const [activationPeriods, setActivationPeriods] = useState([]);
  const [showPieCharts, setShowPieCharts] = useState(false);
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    semester: '',
    subject: '',
    activationPeriod: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedForm) {
      fetchAnalytics();
    }
  }, [selectedForm, filters]);

  const fetchInitialData = async () => {
    try {
      const [formsRes, coursesRes] = await Promise.all([
        adminAPI.getFeedbackForms(),
        adminAPI.getCourses()
      ]);
      setForms(formsRes.data);
      setCourses(coursesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedForm) return;

    setLoading(true);
    setLoadingFacultyAnalytics(true);
    try {
      const params = { formId: selectedForm, ...filters };
      const [response, facultyResponse] = await Promise.all([
        responseAPI.getQuestionAnalytics(params),
        responseAPI.getFacultyQuestionAnalytics(params)
      ]);

      setAnalytics(response.data);
      setFacultyAnalytics(facultyResponse.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setLoadingFacultyAnalytics(false);
    }
  };

  const handleFormChange = (formId) => {
    setSelectedForm(formId);
    setAnalytics(null);
    setFacultyAnalytics(null);

    const form = forms.find(f => f._id === formId);
    if (form) {
      const periods = form.activationPeriods || [];
      setActivationPeriods(periods);
      if (periods.length > 0) {
        const sortedPeriods = [...periods].sort((a, b) => new Date(b.start) - new Date(a.start));
        setFilters(prev => ({ ...prev, activationPeriod: sortedPeriods[0].start }));
      } else {
        setFilters(prev => ({ ...prev, activationPeriod: '' }));
      }
    } else {
      setActivationPeriods([]);
      setFilters(prev => ({ ...prev, activationPeriod: '' }));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!selectedForm) {
      toast.error('Please select a form first');
      return;
    }

    try {
      const params = { formId: selectedForm, ...filters };
      const response = await responseAPI.exportCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${selectedForm}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-royal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 text-royal-600 mr-3" />
            Response Analytics
          </h1>
          <p className="text-gray-600 mt-2">Analyze feedback responses and generate insights</p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => setShowPieCharts(!showPieCharts)}
            disabled={!selectedForm}
            className="flex items-center btn btn-secondary px-3 py-2 rounded-md hover:bg-gray-100 transition"
          >
            {showPieCharts ? (
              <>
                <List className="h-4 w-4 mr-2" />
                Show Table
              </>
            ) : (
              <>
                <PieChartIcon className="h-4 w-4 mr-2" />
                Show Pie Charts
              </>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={!selectedForm}
            className="flex items-center btn btn-primary px-3 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 text-royal-600 mr-2" />
          Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Form</label>
            <select
              value={selectedForm}
              onChange={(e) => handleFormChange(e.target.value)}
              className="input w-full"
            >
              <option value="">Select a form</option>
              {forms.map(form => (
                <option key={form._id} value={form._id}>{form.formName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activation Period</label>
            <select
              value={filters.activationPeriod}
              onChange={(e) => handleFilterChange('activationPeriod', e.target.value)}
              className="input w-full"
              disabled={!selectedForm || activationPeriods.length === 0}
            >
              <option value="">All Periods</option>
              {activationPeriods.map((period, index) => (
                <option key={index} value={period.start}>
                  {`Period ${index + 1}: ${new Date(period.start).toLocaleDateString()} - ${period.end ? new Date(period.end).toLocaleDateString() : 'Active'}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
            <select
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
              className="input w-full"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>{course.courseName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="input w-full"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => handleFilterChange('semester', e.target.value)}
              className="input w-full"
            >
              <option value="">All Semesters</option>
              {[...Array(8)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}{['st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th'][i]} Semester</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="input w-full"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>{subject.subjectName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      {analytics ? (
        <div className="space-y-6">
          {/* Form Overview */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{analytics.form.formName}</h3>
            <p className="text-gray-600 mb-6">{analytics.form.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-royal-600">{analytics.formStats.totalResponses}</div>
                <div className="text-sm text-gray-500">Total Responses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{analytics.formStats.uniqueStudents}</div>
                <div className="text-sm text-gray-500">Unique Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{analytics.formStats.subjects}</div>
                <div className="text-sm text-gray-500">Subjects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{analytics.formStats.courses}</div>
                <div className="text-sm text-gray-500">Courses</div>
              </div>
            </div>
          </div>

          {/* Faculty Analytics / Pie Charts */}
          {loadingFacultyAnalytics ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-royal-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading Faculty Analytics...</p>
            </div>
          ) : (
            <FacultyAnalytics
              data={facultyAnalytics || []}
              questions={analytics.questionAnalytics}
              showCharts={showPieCharts}
            />
          )}

          {/* Question Analytics */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Question Analysis</h3>
            {analytics.questionAnalytics.map((question, index) => {
              const facultyBreakdown = (facultyAnalytics || []).map(facultyData => {
                const questionAnalysis = facultyData.questionAnalytics.find(
                  qa => qa.questionId === question.questionId
                );
                return {
                  faculty: facultyData.faculty,
                  subjects: facultyData.subjects,
                  analytics: questionAnalysis?.analytics || {},
                };
              });

              // fallback to question analytics if no faculty data
              if (facultyBreakdown.length === 0) {
                facultyBreakdown.push({ faculty: null, subjects: [], analytics: question.analytics });
              }

              return (
                <QuestionFacultyAnalytics
                  key={index}
                  question={question}
                  facultyBreakdown={facultyBreakdown}
                  showCharts={showPieCharts}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
          <p className="text-gray-500">Please select a feedback form to view analytics</p>
        </div>
      )}
    </div>
  );
};

export default ResponseAnalytics;
