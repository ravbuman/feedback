import { useState } from 'react';
import { AlertTriangle, List, PieChart as PieChartIcon } from 'lucide-react';
import FacultyAnalytics from './FacultyAnalytics';
import QuestionFacultyAnalytics from './QuestionFacultyAnalytics';

const FormAnalyticsCard = ({ analyticsData }) => {
  const [showCharts, setShowCharts] = useState(false);

  if (!analyticsData || !analyticsData.analytics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available.</h3>
      </div>
    );
  }

  const { analytics, facultyAnalytics } = analyticsData;
  const { form, formStats, questionAnalytics } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center btn btn-secondary px-3 py-2 rounded-md hover:bg-gray-100 transition"
        >
          {showCharts ? (
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
      </div>

      {/* Form Overview */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{form.formName}</h3>
        <p className="text-gray-600 mb-6">{form.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-royal-600">{formStats.totalResponses}</div>
            <div className="text-sm text-gray-500">Total Responses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{formStats.uniqueStudents}</div>
            <div className="text-sm text-gray-500">Unique Students</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formStats.subjects}</div>
            <div className="text-sm text-gray-500">Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{formStats.courses}</div>
            <div className="text-sm text-gray-500">Courses</div>
          </div>
        </div>
      </div>

      {/* Faculty Analytics */}
      <FacultyAnalytics
        data={facultyAnalytics || []}
        questions={questionAnalytics}
        showCharts={showCharts}
      />

      {/* Question Analytics */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Question Analysis</h3>
        {questionAnalytics.map((question, index) => {
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
              showCharts={showCharts}
            />
          )
        })}
      </div>
    </div>
  );
};

export default FormAnalyticsCard;