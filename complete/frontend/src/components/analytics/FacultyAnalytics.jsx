import React from 'react';
import PieChart from './PieChart';
import BarChart from './BarChart';
import HorizontalBarChart from './HorizontalBarChart';
import Histogram from './Histogram';
import { mapRatingToWord } from '../../utils/ratingMapper';

const FacultyAnalytics = ({ data, questions, showCharts }) => {

  const getChartData = (analytics, questionType) => {
    if (!analytics || !analytics.analytics) return [];

    const analyticsData = analytics.analytics;
    let chartData = [];

    switch (questionType) {
      case 'scale':
        if (analyticsData.distribution && Object.keys(analyticsData.distribution).length > 0) {
          chartData = Object.entries(analyticsData.distribution).map(([label, value]) => ({
            label: `Rating ${label}`,
            value: value,
          }));
        } else if (analyticsData.average) {
          chartData = [
            { label: 'Average Rating', value: analyticsData.average }
          ];
        }
        break;

      case 'yesno':
        chartData = [
          { label: 'Yes', value: analyticsData.yesPercentage || analyticsData.yesCount || 0 },
          { label: 'No', value: analyticsData.noPercentage || analyticsData.noCount || 0 },
        ];
        break;

      case 'multiplechoice':
        if (analyticsData.choiceCounts) {
          const processedChoiceCounts = Array.isArray(analyticsData.choiceCounts)
            ? analyticsData.choiceCounts.reduce((acc, item) => {
                acc[item.choice] = item.count;
                return acc;
              }, {})
            : analyticsData.choiceCounts;

          if (Object.keys(processedChoiceCounts).length > 0) {
            chartData = Object.entries(processedChoiceCounts).map(([label, value]) => ({
              label,
              value,
            }));
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (analyticsData.frequentWords && analyticsData.frequentWords.length > 0) {
          chartData = analyticsData.frequentWords.map(fw => ({
            label: fw.word,
            value: fw.count,
          }));
        }
        break;

      default:
        chartData = [];
    }

    return chartData.filter(item => item.value > 0);
  };

  const renderChart = (data, title, questionType, key) => {
    switch (questionType) {
      case 'scale':
        return <Histogram key={key} data={data} title={title} />;
      case 'yesno':
        return <PieChart key={key} data={data} title={title} />;
      case 'multiplechoice':
        return <BarChart key={key} data={data} title={title} />;
      case 'text':
      case 'textarea':
        return <HorizontalBarChart key={key} data={data} title={title} />;
      default:
        return <div key={key} className="text-center text-gray-500 py-8">No chart available for this question type.</div>;
    }
  };

  const renderAnalyticsCell = (analytics) => {
    if (!analytics) {
      return <span className="text-gray-400">N/A</span>;
    }

    switch (analytics.questionType) {
      case 'scale':
        if (!analytics.analytics.average) {
          return <span className="text-gray-400">N/A</span>;
        }
        const avg = analytics.analytics.average;
        const scaleMax = analytics.scaleMax || 5; // Get from analytics or default to 5
        const ratingInfo = mapRatingToWord(avg, scaleMax);
        
        return (
          <div className={`inline-flex items-center px-3 py-1 rounded-full border ${ratingInfo.bgColor} ${ratingInfo.textColor} ${ratingInfo.borderColor}`}>
            <span className="font-semibold">{ratingInfo.word}</span>
            <span className="ml-1">({avg.toFixed(2)})</span>
          </div>
        );
      case 'yesno':
        return (
          <div>
            <span className="text-green-600">Y: {analytics.analytics.yesPercentage?.toFixed(1) || 0}%</span>
            <br />
            <span className="text-red-600">N: {analytics.analytics.noPercentage?.toFixed(1) || 0}%</span>
          </div>
        );
      case 'multiplechoice':
        const rawChoiceCounts = analytics.analytics.choiceCounts || {};
        const processedChoiceCounts = Array.isArray(rawChoiceCounts)
          ? rawChoiceCounts.reduce((acc, item) => {
              acc[item.choice] = item.count;
              return acc;
            }, {})
          : rawChoiceCounts;

        return (
          Object.keys(processedChoiceCounts).length > 0
            ? Object.entries(processedChoiceCounts).map(([choice, count]) => (
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
      {showCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions?.map(question => {
            const aggregatedData = data?.reduce((acc, facultyData) => {
              const questionAnalytics = facultyData.questionAnalytics.find(qa => qa.questionId === question.questionId);
              if (questionAnalytics) {
                const chartData = getChartData(questionAnalytics, question.questionType);
                chartData.forEach(d => {
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

            return renderChart(
              aggregatedData,
              question.questionText,
              question.questionType,
              question.questionId
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
                  <th key={question.questionId} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  {questions.map((question) => {
                    const analytics = facultyData.questionAnalytics.find(qa => qa.questionId === question.questionId);
                    return (
                      <td key={`qa-${question.questionId}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {analytics ? renderAnalyticsCell(analytics) : <span className="text-gray-400">N/A</span>}
                      </td>
                    );
                  })}
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