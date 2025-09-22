import React from 'react';
import PieChart from './PieChart';

const QuestionFacultyAnalytics = ({ question, facultyBreakdown, showPieCharts }) => {

  const renderAnalyticsCell = (analytics) => {
    if (!analytics) {
      return <span className="text-gray-400">N/A</span>;
    }

    switch (question.questionType) {
      case 'scale':
        return analytics.average?.toFixed(2) || <span className="text-gray-400">N/A</span>;
      case 'yesno':
        return (
          <div>
            <span className="text-green-600">Y: {analytics.yesPercentage?.toFixed(1) || 0}%</span>
            <br />
            <span className="text-red-600">N: {analytics.noPercentage?.toFixed(1) || 0}%</span>
          </div>
        );
      case 'multiplechoice':
        // console.log("QuestionFacultyAnalytics - MultipleChoice choiceCounts:", analytics.choiceCounts); // Removed console.log
        return (
          analytics.choiceCounts && Object.keys(analytics.choiceCounts).length > 0
            ? Object.entries(analytics.choiceCounts).map(([choice, count]) => (
                <div key={choice}>{choice}: {count}</div>
              ))
            : <span className="text-gray-400">N/A</span>
        );
      case 'text':
      case 'textarea':
        return (
          analytics.frequentWords?.map(fw => `${fw.word} (${fw.count})`).join(', ') || <span className="text-gray-400">N/A</span>
        );
      default:
        return <span className="text-gray-400">N/A</span>;
    }
  };

  const getHeaderText = () => {
    switch (question.questionType) {
      case 'scale': return 'Average Rating';
      case 'yesno': return 'Yes/No Percentage';
      case 'multiplechoice': return 'Most Frequent Choice';
      case 'text':
      case 'textarea': return 'Most Frequent Words (Count)';
      default: return 'Analytics';
    }
  }

  const getPieChartData = (analyticsData = {}) => {
    let pieChartData = [];

    switch (question.questionType) {
      case 'scale':
        if (analyticsData.distribution && Object.keys(analyticsData.distribution).length > 0) {
          pieChartData = Object.entries(analyticsData.distribution).map(([label, value]) => ({
            label: `Rating ${label}`,
            value,
          }));
        } else if (analyticsData.average) {
          pieChartData = [
            { label: 'Average Rating', value: analyticsData.average }
          ];
        }
        break;

      case 'yesno':
        pieChartData = [
          { label: 'Yes', value: analyticsData.yesPercentage || analyticsData.yesCount || 0 },
          { label: 'No', value: analyticsData.noPercentage || analyticsData.noCount || 0 },
        ];
        break;

      case 'multiplechoice':
        if (analyticsData.choiceCounts && Object.keys(analyticsData.choiceCounts).length > 0) {
          pieChartData = Object.entries(analyticsData.choiceCounts).map(([label, value]) => ({
            label,
            value,
          }));
        } else if (analyticsData.mostFrequentChoice) {
          pieChartData = [
            { label: analyticsData.mostFrequentChoice, value: 1 }
          ];
        }
        break;

      default:
        pieChartData = [];
    }

    return pieChartData.filter(item => item.value > 0);
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{question.questionText}</h4>
      </div>

      {showPieCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facultyBreakdown?.map((item, index) => {
            const pieChartData = getPieChartData(item.analytics);
            return (
              <PieChart
                key={item.faculty ? item.faculty._id : `overall-${question._id}-${index}`}
                data={pieChartData}
                title={item.faculty ? item.faculty.name : `Overall: ${question.questionText}`}
              />
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getHeaderText()}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facultyBreakdown?.map((item, index) => (
                <tr key={item.faculty ? item.faculty._id : `overall-${question._id}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.faculty ? item.faculty.name : 'Overall'}</div>
                    <div className="text-sm text-gray-500">{item.subjects.join(', ')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renderAnalyticsCell(item.analytics)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuestionFacultyAnalytics;