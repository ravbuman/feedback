import React from 'react';
import PieChart from './PieChart';

const FacultyAnalytics = ({ data, questions, showPieCharts }) => {

  const transformDataForPieChart = (analytics) => {
    if (!analytics || !analytics.analytics) return [];

    const { questionType, analytics: analyticsData = {} } = analytics;
    let pieChartData = [];

    switch (questionType) {
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

  const renderAnalyticsCell = (analytics) => {
    if (!analytics) {
      return <span className="text-gray-400">N/A</span>;
    }

    switch (analytics.questionType) {
      case 'scale':
        return analytics.analytics.average?.toFixed(2) || <span className="text-gray-400">N/A</span>;
      case 'yesno':
        return (
          <div>
            <span className="text-green-600">Y: {analytics.analytics.yesPercentage?.toFixed(1) || 0}%</span>
            <br />
            <span className="text-red-600">N: {analytics.analytics.noPercentage?.toFixed(1) || 0}%</span>
          </div>
        );
      case 'multiplechoice':
        // console.log("FacultyAnalytics - MultipleChoice choiceCounts:", analytics.analytics.choiceCounts); // Removed console.log
        return (
          analytics.analytics.choiceCounts && Object.keys(analytics.analytics.choiceCounts).length > 0
            ? Object.entries(analytics.analytics.choiceCounts).map(([choice, count]) => (
                <div key={`${choice}-${count}`}>{choice}: {count}</div>
              ))
            : <span className="text-gray-400">N/A</span>
        );
      case 'text':
      case 'textarea':
        return analytics.analytics.frequentWords?.map(fw => `${fw.word} (${fw.count})`).join(', ') || <span className="text-gray-400">N/A</span>;
      default:
        return <span className="text-gray-400">N/A</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Faculty-wise Analytics</h3>
      {showPieCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions?.map(question => {
            const aggregatedData = data?.reduce((acc, facultyData) => {
              const questionAnalytics = facultyData.questionAnalytics.find(qa => qa.questionId === question.questionId);
              if (questionAnalytics) {
                const pieData = transformDataForPieChart(questionAnalytics);
                pieData.forEach(d => {
                  const existing = acc.find(item => item.label === d.label);
                  if (existing) {
                    existing.value += d.value;
                  } else {
                    acc.push({ ...d });
                  }
                });
              }
              return acc;
            }, []);

            return (
              <PieChart
                key={question._id}
                data={aggregatedData}
                title={question.questionText}
              />
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th key="faculty-subject" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty / Subject
                </th>
                {questions?.map((question) => (
                  <th key={question._id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {question.questionText}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.map((facultyData) => (
                <tr key={facultyData.faculty._id}>
                  <td key={`${facultyData.faculty._id}-details`} className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{facultyData.faculty.name}</div>
                    <div className="text-sm text-gray-500">{facultyData.subjects.join(', ')}</div>
                  </td>
                  {facultyData.questionAnalytics.map((analytics) => (
                    <td key={analytics.questionId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renderAnalyticsCell(analytics)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FacultyAnalytics;