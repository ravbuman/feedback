import React, { useState, useEffect } from 'react';
import { responseAPI, adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  FileText, 
  Download,
  Filter,
  Search,
  Loader2,
  Calendar,
  BookOpen,
  GraduationCap,
  Target,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  BarChart2,
  Activity
} from 'lucide-react';

const ResponseAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [forms, setForms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState('');
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    semester: '',
    subject: ''
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
    try {
      const params = {
        formId: selectedForm,
        ...filters
      };
      
      const response = await responseAPI.getQuestionAnalytics(params);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (formId) => {
    setSelectedForm(formId);
    setAnalytics(null);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    if (!selectedForm) {
      toast.error('Please select a form first');
      return;
    }

    try {
      const params = {
        formId: selectedForm,
        ...filters
      };
      
      const response = await responseAPI.exportCSV(params);
      
      // Create download link
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

  const renderScaleAnalytics = (question) => {
    if (!question.scale) return null;

    const { min, max, average, distribution } = question.scale;
    const totalResponses = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{question.questionText}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-royal-600">{average.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{min}</div>
            <div className="text-sm text-gray-500">Lowest Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{max}</div>
            <div className="text-sm text-gray-500">Highest Rating</div>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Rating Distribution</h5>
          {Object.entries(distribution).map(([rating, count]) => {
            const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className="w-8 text-sm font-medium text-gray-600">{rating}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-royal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYesNoAnalytics = (question) => {
    if (!question.yesno) return null;

    const { yes, no, yesPercentage, noPercentage } = question.yesno;

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{question.questionText}</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{yes}</div>
            <div className="text-sm text-gray-500">Yes ({yesPercentage.toFixed(1)}%)</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${yesPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">{no}</div>
            <div className="text-sm text-gray-500">No ({noPercentage.toFixed(1)}%)</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${noPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMultipleChoiceAnalytics = (question) => {
    if (!question.multiplechoice) return null;

    const { options } = question.multiplechoice;
    const totalResponses = options.reduce((sum, option) => sum + option.count, 0);

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{question.questionText}</h4>
        
        <div className="space-y-3">
          {options.map((option, index) => {
            const percentage = totalResponses > 0 ? (option.count / totalResponses) * 100 : 0;
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
            const colorClass = colors[index % colors.length];
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{option.text}</span>
                    <span className="text-sm text-gray-500">{option.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTextAnalytics = (question) => {
    if (!question.text) return null;

    const { totalTextResponses, averageLength, wordCount, sampleResponses } = question.text;

    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">{question.questionText}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-royal-600">{totalTextResponses}</div>
            <div className="text-sm text-gray-500">Text Responses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{Math.round(averageLength)}</div>
            <div className="text-sm text-gray-500">Avg Characters</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{Math.round(wordCount)}</div>
            <div className="text-sm text-gray-500">Avg Words</div>
          </div>
        </div>

        {sampleResponses.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-700 mb-3">Sample Responses</h5>
            <div className="space-y-2">
              {sampleResponses.map((response, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  "{response}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQuestionAnalytics = (question) => {
    switch (question.questionType) {
      case 'scale':
        return renderScaleAnalytics(question);
      case 'yesno':
        return renderYesNoAnalytics(question);
      case 'multiplechoice':
        return renderMultipleChoiceAnalytics(question);
      case 'text':
      case 'textarea':
        return renderTextAnalytics(question);
      default:
        return null;
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 text-royal-600 mr-3" />
              Response Analytics
            </h1>
            <p className="text-gray-600 mt-2">Analyze feedback responses and generate insights</p>
          </div>
          <button
            onClick={handleExport}
            disabled={!selectedForm}
            className="btn btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 text-royal-600 mr-2" />
          Filters
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Form</label>
            <select
              value={selectedForm}
              onChange={(e) => handleFormChange(e.target.value)}
              className="input"
            >
              <option value="">Select a form</option>
              {forms.map(form => (
                <option key={form._id} value={form._id}>
                  {form.formName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
            <select
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
              className="input"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="input"
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
              className="input"
            >
              <option value="">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">3rd Semester</option>
              <option value="4">4th Semester</option>
              <option value="5">5th Semester</option>
              <option value="6">6th Semester</option>
              <option value="7">7th Semester</option>
              <option value="8">8th Semester</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="input"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>
                  {subject.subjectName}
                </option>
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          {/* Question Analytics */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Question Analysis</h3>
            {analytics.questionAnalytics.map((question, index) => (
              <div key={index}>
                {renderQuestionAnalytics(question)}
              </div>
            ))}
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
