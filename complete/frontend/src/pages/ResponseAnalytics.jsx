import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { responseAPI, adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Download,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  List,
  ArrowLeft,
  GitCompare,
  ClipboardX
} from 'lucide-react';
import FacultyAnalytics from '../components/analytics/FacultyAnalytics';
import QuestionFacultyAnalytics from '../components/analytics/QuestionFacultyAnalytics';
import Loader from '../components/Loader';
import ComparePeriodModal from '../components/Modals/ComparePeriodModal';

const ResponseAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [comparisonAnalytics, setComparisonAnalytics] = useState(null);
  const [facultyAnalytics, setFacultyAnalytics] = useState(null);
  const [forms, setForms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFacultyAnalytics, setLoadingFacultyAnalytics] = useState(false);
  const [selectedForm, setSelectedForm] = useState('');
  const [activationPeriods, setActivationPeriods] = useState([]);
  const [showPieCharts, setShowPieCharts] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [textAnswersByQuestion, setTextAnswersByQuestion] = useState({});
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    semester: '',
    section: '',
    subject: '',
    activationPeriod: ''
  });
  const navigate = useNavigate();

  const AnswerBox = ({ data }) => {
    const [expanded, setExpanded] = useState(false);
    const charLimit = 200;
    const isLong = (data?.answer?.length || 0) > charLimit;
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 mb-2 gap-2">
          <span className="font-mono">{data.rollNumber || '-'}</span>
          <span>{data.subjectName || '-'}</span>
          <span>{new Date(data.submittedAt).toLocaleString()}</span>
        </div>
        <div className={`text-sm break-words break-all whitespace-pre-wrap relative ${(!isLong || expanded) ? '' : 'max-h-40 overflow-hidden pr-2'}`}>
          {data.answer}
          {isLong && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
          )}
        </div>
        {isLong && (
          <div className="mt-2 text-right">
            <button className="text-royal-600 text-xs font-bold hover:text-royal-900" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    console.log('useEffect for fetching analytics triggered. selectedForm:', selectedForm, 'filters:', filters);
    if (selectedForm) {
      fetchAnalytics();
    }
  }, [filters, selectedForm]);

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

  const fetchAnalytics = async (customFilters = null) => {
    if (!selectedForm) return null;

    const currentFilters = customFilters || filters;

    // Validate activation period format
    if (currentFilters.activationPeriod) {
      try {
        currentFilters.activationPeriod = new Date(currentFilters.activationPeriod)
          .toISOString();
      } catch (e) {
        console.error('Invalid activation period date:', currentFilters.activationPeriod);
        toast.error('Invalid activation period');
        return null;
      }
    }

    // Only set loading states when not in comparison mode
    if (!customFilters) {
      setLoading(true);
      setLoadingFacultyAnalytics(true);
    }

    try {
      const params = { formId: selectedForm, ...currentFilters };
      const [response, facultyResponse] = await Promise.all([
        responseAPI.getQuestionAnalytics(params),
        responseAPI.getFacultyQuestionAnalytics(params)
      ]);

      if (!response.data || !response.data.formStats) {
        throw new Error('Invalid response data');
      }

      console.log('Analytics Response:', response.data);
      console.log('Faculty Analytics Response:', facultyResponse.data);

      // Check if we have any responses at all
      const hasResponses = response.data.formStats.totalResponses > 0;

      if (!customFilters) {
        setAnalytics(response.data);
        setFacultyAnalytics(facultyResponse.data || []);
      }

      return {
        analytics: response.data,
        facultyAnalytics: facultyResponse.data || [],
        hasResponses
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 404) {
        toast.error('No data found for the selected period');
      } else {
        toast.error('Failed to load analytics');
      }
      return null;
    } finally {
      // Only reset loading states when not in comparison mode
      if (!customFilters) {
        setLoading(false);
        setLoadingFacultyAnalytics(false);
      }
    }
  };

  const loadTextAnswersForQuestion = async (questionId, facultyId = null, page = 1) => {
    const baseParams = { formId: selectedForm, ...filters, questionId, page, limit: 50 };
    if (facultyId) baseParams.facultyId = facultyId;
    const res = await responseAPI.getTextAnswersByFaculty(baseParams);
    // Store per question
    setTextAnswersByQuestion(prev => ({ ...prev, [questionId]: res.data }));
    return res.data;
  };

  const exportTextAnswers = async (questionId, facultyId = '') => {
    const params = { formId: selectedForm, ...filters, questionId };
    if (facultyId) params.facultyId = facultyId;
    const blobRes = await responseAPI.exportTextAnswersCSV(params);
    const url = window.URL.createObjectURL(new Blob([blobRes.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `text_answers_${questionId}${facultyId ? '_' + facultyId : ''}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleCompare = async (selectedPeriods) => {
    setLoadingFacultyAnalytics(true);
    setLoading(true);

    try {
      // Sort periods chronologically
      const sortedPeriods = [...selectedPeriods].sort((a, b) => new Date(a) - new Date(b));

      // Fetch data for each selected period with specific period filters
      const periodsData = await Promise.all(
        sortedPeriods.map(async period => {
          // Create a new filter object for each period to ensure unique data
          const periodFilter = {
            ...filters,
            activationPeriod: period
          };

          // Clear any cached data before fetching
          setAnalytics(null);
          setFacultyAnalytics(null);

          const result = await fetchAnalytics(periodFilter, true);  // Pass true to skip state updates

          if (result?.analytics?.formStats?.totalResponses === 0) {
            // Don't use previous period data in comparison mode
            return null;
          }

          if (result) {
            return {
              period: period,
              data: result
            };
          }
          return null;
        })
      );

      const validResults = periodsData.filter(result => result !== null);

      if (validResults.length > 0) {
        const combinedAnalytics = {};
        validResults.forEach((result, index) => {
          // Store each period's data separately
          combinedAnalytics[`period${index + 1}`] = {
            ...result.data,
            periodStart: result.period
          };
        });

        console.log('Combined Analytics:', JSON.stringify(combinedAnalytics, null, 2));
        setComparisonAnalytics(combinedAnalytics);
      }
    } catch (error) {
      console.error('Error comparing periods:', error);
      toast.error('Failed to compare periods');
    } finally {
      setLoadingFacultyAnalytics(false); // Reset both loading states
      setLoading(false);
    }
  };

  const handleFormChange = (formId) => {
    setSelectedForm(formId);
    setAnalytics(null);
    setFacultyAnalytics(null);

    const form = forms.find((f) => f._id === formId);
    if (form) {
      const periods = form.activationPeriods || [];
      setActivationPeriods(periods);
      if (periods.length > 0) {
        const sortedPeriods = [...periods].sort((a, b) => new Date(b.start) - new Date(a.start));
        setFilters({
          course: '',
          year: '',
          semester: '',
          section: '',
          subject: '',
          activationPeriod: sortedPeriods[0].start,
        });
      } else {
        setFilters({
          course: '',
          year: '',
          semester: '',
          section: '',
          subject: '',
          activationPeriod: '',
        });
      }
    } else {
      setActivationPeriods([]);
      setFilters({
        course: '',
        year: '',
        semester: '',
        section: '',
        subject: '',
        activationPeriod: '',
      });
    }
  };

  const handleFilterChange = (key, value) => {
    console.log('Filter changed:', key, value);
    // Format the activationPeriod date to match server expectations
    if (key === 'activationPeriod' && value) {
      const formattedDate = new Date(value).toISOString();
      setFilters(prev => ({ ...prev, [key]: formattedDate }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
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

  const handleComprehensiveExport = async () => {
    if (!selectedForm) {
      toast.error('Please select a form first');
      return;
    }

    try {
      const params = { 
        formId: selectedForm, 
        course: filters.course,
        activationPeriod: filters.activationPeriod
      };
      const response = await responseAPI.exportComprehensiveAnalytics(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprehensive_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Comprehensive analytics exported successfully');
    } catch (error) {
      console.error('Comprehensive export error:', error);
      toast.error('Failed to export comprehensive analytics');
    }
  };

  if (loading && !analytics && !comparisonAnalytics) {
    return <Loader />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-royal-600 mr-2 md:mr-3" />
              Response Analytics
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Analyze feedback responses and generate insights</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-4">
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
                Show Charts
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (comparisonAnalytics) {
                setComparisonAnalytics(null);
              } else {
                setShowCompareModal(true);
              }
            }}
            disabled={!selectedForm || (!comparisonAnalytics && activationPeriods.length < 2)}
            className={`flex items-center ${comparisonAnalytics ? 'btn btn-royal' : 'btn btn-secondary'} px-3 py-2 rounded-md transition`}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {comparisonAnalytics ? 'Exit Comparison' : 'Compare Periods'}
          </button>

          <button
            onClick={handleComprehensiveExport}
            disabled={!selectedForm}
            className="flex items-center btn btn-primary px-3 py-2 rounded-md hover:bg-green-700 transition bg-green-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Analytics (Excel)
          </button>

          <button
            onClick={handleExport}
            disabled={!selectedForm}
            className="flex items-center btn btn-secondary px-3 py-2 rounded-md hover:bg-gray-200 transition"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 md:p-6 border border-gray-200 mb-6 overflow-x-hidden">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-4 w-4 md:h-5 md:w-5 text-royal-600 mr-2" />
          Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
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
              {[...Array(2)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}{['st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th'][i]} Semester</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
              className="input w-full"
              disabled={!filters.course || !filters.year || !filters.semester}
            >
              <option value="">All Sections</option>
              {filters.course && filters.year && filters.semester && (() => {
                const course = courses.find(c => c._id === filters.course);
                const yearSemData = course?.yearSemesterSections?.find(
                  ys => ys.year === parseInt(filters.year) && ys.semester === parseInt(filters.semester)
                );
                return yearSemData?.sections?.map(section => (
                  <option key={section._id} value={section._id}>Section {section.sectionName}</option>
                ));
              })()}
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

      {/* Compare Period Modal */}
      <ComparePeriodModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        activationPeriods={activationPeriods}
        onCompare={handleCompare}
      />

      {/* Analytics Content */}
      {(analytics || comparisonAnalytics) ? (
        <div className="space-y-6">
          {/* Form Overview */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{(analytics?.form || comparisonAnalytics?.period1?.analytics?.form)?.formName || 'Analytics'}</h3>
            <p className="text-gray-600 mb-6">{(analytics?.form || comparisonAnalytics?.period1?.analytics?.form)?.description || ''}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {comparisonAnalytics ? (
                <>
                  <div className="col-span-full mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Period Comparison</h4>
                  </div>
                  <div className="text-center col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Total Responses</div>
                    <div className="flex flex-wrap justify-center items-center gap-4">
                      {Object.entries(comparisonAnalytics).map(([periodKey, data], index) => {
                        const period = activationPeriods.find(p => p.start === data.periodStart);
                        const isActive = period && !period.end;
                        const startDate = new Date(period.start).toLocaleDateString();
                        const endDate = period.end ? new Date(period.end).toLocaleDateString() : 'Active';

                        return (
                          <div key={periodKey} className="flex items-center">
                            {index > 0 && <div className="text-gray-400 mx-2">vs</div>}
                            <div>
                              {data.analytics.formStats.totalResponses > 0 ? (
                                <div className="text-xl md:text-2xl font-bold text-royal-600">
                                  {data.analytics.formStats.totalResponses}
                                  {data.isUsingPreviousPeriodData && (
                                    <span className="text-xs text-amber-500 ml-1">(Previous Period)</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <ClipboardX className="h-6 w-6 text-gray-400 mb-1" />
                                  <div className="text-sm text-gray-500">No Responses</div>
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {startDate} - {endDate}
                                {isActive && <span className="ml-1 text-green-500">(Active)</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-center col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Unique Students</div>
                    <div className="flex flex-wrap justify-center items-center gap-4">
                      {Object.entries(comparisonAnalytics).map(([periodKey, data], index) => (
                        <div key={periodKey} className="flex items-center">
                          {index > 0 && <div className="text-gray-400 mx-2">vs</div>}
                          <div>
                            <div className="text-xl md:text-2xl font-bold text-green-600">
                              {data.analytics.formStats.uniqueStudents}
                            </div>
                            <div className="text-xs text-gray-500">Period {index + 1}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Faculty Analytics / Pie Charts */}
          {!comparisonAnalytics && (
            loadingFacultyAnalytics ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-royal-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading Faculty Analytics...</p>
              </div>
            ) : analytics.formStats.totalResponses === 0 ? (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="text-center py-8">
                  <ClipboardX className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Responses Yet</h4>
                  <p className="text-gray-600">
                    {activationPeriods.find(p => p.start === filters.activationPeriod && !p.end)
                      ? "This period is currently active. Analytics will be shown as responses are submitted."
                      : "No responses were received during this period."}
                  </p>
                </div>
              </div>
            ) : (
              <FacultyAnalytics
                data={facultyAnalytics || []}
                questions={analytics.questionAnalytics}
                showCharts={showPieCharts}
              />
            )
          )}

          {/* Question Analytics */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Question Analysis</h3>
            {comparisonAnalytics ? (
              // When comparing periods, show each question with period data side by side
              comparisonAnalytics.period1.analytics.questionAnalytics.map((question, index) => {
                // Get only the periods that have actual data
                const validPeriods = Object.entries(comparisonAnalytics).filter(([_, periodData]) =>
                  periodData.analytics && periodData.facultyAnalytics &&
                  periodData.facultyAnalytics.length > 0 &&
                  periodData.analytics.formStats.totalResponses > 0
                );

                // Get faculty data from all valid periods
                const allFacultyData = validPeriods.flatMap(([_, periodData]) => periodData.facultyAnalytics);
                const uniqueFacultyIds = [...new Set(allFacultyData.map(f => f.faculty._id))];
                const referenceFacultyList = uniqueFacultyIds.map(id =>
                  allFacultyData.find(f => f.faculty._id === id)
                ).filter(Boolean);

                // Generate accurate period labels
                const toIso = (v) => {
                  try { return new Date(v).toISOString(); } catch { return String(v || ''); }
                };
                const periodLabels = validPeriods.map(([_, periodData]) => {
                  const match = activationPeriods.find(p => toIso(p.start) === toIso(periodData.periodStart));
                  if (match) {
                    const startDate = new Date(match.start).toLocaleDateString();
                    const endDate = match.end ? new Date(match.end).toLocaleDateString() : 'Active';
                    return `${startDate} - ${endDate}`;
                  }
                  // Fallback if not found in local activationPeriods
                  const startDate = new Date(periodData.periodStart).toLocaleDateString();
                  return `${startDate}`;
                });

                // For each faculty, create a row that shows their data across valid periods only
                const periodsData = referenceFacultyList.map(facultyRef => {
                  return {
                    faculty: facultyRef.faculty,
                    subjects: facultyRef.subjects,
                    // Include faculty analytics only from valid periods
                    facultyAnalytics: validPeriods.map(([_, periodData]) => {
                      const facultyInPeriod = periodData.facultyAnalytics.find(
                        f => f.faculty._id === facultyRef.faculty._id
                      );
                      const questionData = facultyInPeriod?.questionAnalytics.find(
                        q => q.questionId === question.questionId
                      );
                      // Only return analytics if the period has valid data
                      return questionData?.analytics ? {
                        scale: questionData.analytics,
                        analytics: questionData.analytics
                      } : null;
                    })
                  };
                });

                return (
                  <QuestionFacultyAnalytics
                    key={question.questionId}
                    question={question}
                    facultyBreakdown={periodsData}
                    showCharts={showPieCharts}
                    isPeriodComparison={true}
                    periodLabels={periodLabels}
                  />
                );
              })
            ) : (
              // Regular view showing faculty breakdown (no Overall row)
              analytics.questionAnalytics.map((question, index) => {
                const isText = question.questionType === 'text' || question.questionType === 'textarea';
                const facultyBreakdown = (facultyAnalytics && facultyAnalytics.length > 0)
                  ? facultyAnalytics.map(facultyData => {
                    const questionAnalysis = facultyData.questionAnalytics.find(
                      qa => qa.questionId === question.questionId
                    );
                    return {
                      faculty: facultyData.faculty,
                      subjects: facultyData.subjects,
                      analytics: questionAnalysis?.analytics || {}
                    };
                  })
                  : [];

                return (
                  <div key={question.questionId} className="space-y-4">
                    <QuestionFacultyAnalytics
                      question={question}
                      facultyBreakdown={facultyBreakdown}
                      showCharts={showPieCharts}
                      isPeriodComparison={false}
                    />

                    {isText && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-semibold text-gray-900">Raw Text Answers</h4>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => loadTextAnswersForQuestion(question.questionId)}
                            >
                              Load Answers
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => exportTextAnswers(question.questionId)}
                            >
                              Export CSV (All Faculties)
                            </button>
                          </div>
                        </div>
                        <div className="divide-y">
                          {(textAnswersByQuestion[question.questionId] || []).length === 0 ? (
                            <p className="text-sm text-gray-500">No data loaded yet.</p>
                          ) : (
                            (textAnswersByQuestion[question.questionId] || []).map(group => (
                              <details key={group.faculty._id} className="py-3">
                                <summary className="cursor-pointer flex items-center justify-between">
                                  <span className="font-medium">{group.faculty.name}</span>
                                  <span className="text-xs text-gray-500">{group.total} answers</span>
                                </summary>
                                <div className="mt-3 space-y-3">
                                  <div className="flex justify-end gap-2">
                                    <button className="btn btn-secondary btn-sm" onClick={() => exportTextAnswers(question.questionId, group.faculty._id)}>Export CSV</button>
                                    {group.hasMore && (
                                      <button
                                        className="btn btn-outline btn-sm"
                                        onClick={async () => {
                                          const nextPage = (group.page || 1) + 1;
                                          const more = await loadTextAnswersForQuestion(question.questionId, group.faculty._id, nextPage);
                                          setTextAnswersByQuestion(prev => {
                                            const current = prev[question.questionId] || [];
                                            const updated = current.map(g => g.faculty._id === group.faculty._id ? more.find(m => m.faculty._id === g.faculty._id) || g : g);
                                            return { ...prev, [question.questionId]: updated };
                                          });
                                        }}
                                      >
                                        Load More
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {group.answers.map((a, idx) => (
                                      <AnswerBox key={idx} data={a} />
                                    ))}
                                  </div>
                                </div>
                              </details>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {/* Old standalone text answers section removed; now integrated under each question card */}
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