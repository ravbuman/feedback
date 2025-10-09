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
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    semester: '',
    subject: '',
    activationPeriod: ''
  });
  const navigate = useNavigate();

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
          subject: '',
          activationPeriod: sortedPeriods[0].start,
        });
      } else {
        setFilters({
          course: '',
          year: '',
          semester: '',
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

  if (loading && !analytics && !comparisonAnalytics) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
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
                const periodLabels = validPeriods.map(([_, periodData]) => {
                  const period = activationPeriods.find(p => p.start === periodData.periodStart);
                  const startDate = new Date(period.start).toLocaleDateString();
                  const endDate = period.end ? new Date(period.end).toLocaleDateString() : 'Active';
                  return `${startDate} - ${endDate}`;
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
              // Regular view showing faculty breakdown
              analytics.questionAnalytics.map((question, index) => {
                const facultyBreakdown = [{
                  faculty: null,
                  subjects: [],
                  analytics: question.analytics || {}
                }];

                if (facultyAnalytics && facultyAnalytics.length > 0) {
                  facultyBreakdown.push(
                    ...facultyAnalytics.map(facultyData => {
                      const questionAnalysis = facultyData.questionAnalytics.find(
                        qa => qa.questionId === question.questionId
                      );
                      return {
                        faculty: facultyData.faculty,
                        subjects: facultyData.subjects,
                        analytics: questionAnalysis?.analytics || {}
                      };
                    })
                  );
                }

                return (
                  <QuestionFacultyAnalytics
                    key={question.questionId}
                    question={question}
                    facultyBreakdown={facultyBreakdown}
                    showCharts={showPieCharts}
                    isPeriodComparison={false}
                  />
                );
              })
            )}
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