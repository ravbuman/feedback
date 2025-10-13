import React from 'react';
import PieChart from './PieChart';
import BarChart from './BarChart';
import HorizontalBarChart from './HorizontalBarChart';
import Histogram from './Histogram';
import LineChart from './LineChart';

const QuestionFacultyAnalytics = ({ question, facultyBreakdown, showCharts, isPeriodComparison, periodLabels }) => {
  console.log('QuestionFacultyAnalytics props:', {
    question,
    facultyBreakdown,
    isPeriodComparison,
    periodLabels
  });
  
  // Ensure analytics data is properly structured
  const processedFacultyBreakdown = facultyBreakdown.map(item => ({
    ...item,
    analytics: item.analytics || question.analytics || {}
  }));

  const renderAnalyticsCell = (analytics) => {
    if (!analytics) {
      console.log('Analytics is null/undefined');
      return <span className="text-gray-400">N/A</span>;
    }
    console.log('Rendering analytics cell:', { questionType: question.questionType, analytics });

    switch (question.questionType) {
      case 'scale':
        // In period comparison mode, look for the question-specific analytics
        const questionAnalytics = analytics.questionAnalytics?.find(q => q.questionId === question.questionId);
        const scaleData = questionAnalytics?.analytics || analytics.scale || analytics;
        const average = scaleData.average;
        return average?.toFixed(2) || <span className="text-gray-400">N/A</span>;

      case 'yesno':
        const yesNoData = analytics.questionAnalytics?.find(q => q.questionId === question.questionId)?.analytics || analytics;
        return (
          <div>
            <span className="text-green-600">Y: {yesNoData.yesPercentage?.toFixed(1) || 0}%</span>
            <br />
            <span className="text-red-600">N: {yesNoData.noPercentage?.toFixed(1) || 0}%</span>
          </div>
        );

      case 'multiplechoice':
        const mcData = analytics.questionAnalytics?.find(q => q.questionId === question.questionId)?.analytics || analytics;
        const rawChoiceCounts = mcData.choiceCounts || {};
        console.log('Multiple choice counts:', rawChoiceCounts);
        const processedChoiceCounts = Array.isArray(rawChoiceCounts)
          ? rawChoiceCounts.reduce((acc, item) => {
            acc[item.choice] = item.count;
            return acc;
          }, {})
          : rawChoiceCounts;

        return (
          Object.keys(processedChoiceCounts).length > 0
            ? Object.entries(processedChoiceCounts).map(([choice, count]) => (
              <div key={choice}>{choice}: {count}</div>
            ))
            : <span className="text-gray-400">N/A</span>
        );

      case 'text':
      case 'textarea':
        const textData = analytics.questionAnalytics?.find(q => q.questionId === question.questionId)?.analytics || analytics;
        return (
          textData.frequentWords?.map(fw => `${fw.word} (${fw.count})`).join(', ') || <span className="text-gray-400">N/A</span>
        );

      default:
        return <span className="text-gray-400">N/A</span>;
    }
  };

  const getHeaderText = () => {
    switch (question.questionType) {
      case 'scale': return 'Average Rating';
      case 'yesno': return 'Yes/No Percentage';
      case 'multiplechoice': return 'Choices & Counts';
      case 'text':
      case 'textarea': return 'Most Frequent Words (Count)';
      default: return 'Analytics';
    }
  }

  const getChartData = (analyticsData = {}) => {
    let chartData = [];
    
    switch (question.questionType) {
      case 'scale':
        const distribution = analyticsData.distribution || analyticsData.scale?.distribution;
        const average = analyticsData.average || analyticsData.scale?.average;
        
        if (distribution && Object.keys(distribution).length > 0) {
          chartData = Object.entries(distribution).map(([label, value]) => ({
            label: `Rating ${label}`,
            value: value,
          }));
        } else if (average) {
          chartData = [
            { label: 'Average Rating', value: average }
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

    const renderChart = (data, title, questionType, key, isPeriodComparison = false, facultyData = null, periodLabels = []) => {
    if (isPeriodComparison && facultyData) {
      // Create separate chart for each faculty
      const facultyCharts = facultyData.map(faculty => {
        // Get this faculty's values across periods
        const values = faculty.facultyAnalytics.map(period => {
          if (!period) return 0;
          
          switch (questionType) {
            case 'scale':
              return (period.analytics && typeof period.analytics.average === 'number')
                ? period.analytics.average
                : (period.scale && typeof period.scale.average === 'number')
                  ? period.scale.average
                  : 0;
            case 'yesno':
              return (period.analytics && typeof period.analytics.yesPercentage === 'number')
                ? period.analytics.yesPercentage
                : 0;
            case 'multiplechoice':
              const counts = (period.analytics && period.analytics.choiceCounts)
                ? (Array.isArray(period.analytics.choiceCounts)
                    ? period.analytics.choiceCounts.reduce((acc, item) => {
                        acc[item.choice] = item.count;
                        return acc;
                      }, {})
                    : period.analytics.choiceCounts)
                : {};
              const valuesArray = Object.values(counts);
              const maxCount = valuesArray.length > 0 ? Math.max(...valuesArray) : 0;
              return maxCount || 0;
            default:
              return 0;
          }
        });

        // Do not skip completely; allow zero-lines to render to avoid fallback UI

        const facultyData = [{
          label: 'Rating',  // Single line per chart, so just label it 'Rating'
          values: values,
          maxValue: questionType === 'scale' ? 5 : 
                   questionType === 'yesno' ? 100 : 
                   Math.max(...values) * 1.2
        }];

        return (
          <div key={`${key}-${faculty.faculty._id}`} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="mb-2">
              <div className="text-sm font-medium text-gray-900">{faculty.faculty.name}</div>
              <div className="text-xs text-gray-500">{faculty.subjects.join(', ')}</div>
            </div>
            <div className="h-[200px]">
              <LineChart 
                data={facultyData}
                title={`${title} - ${faculty.faculty.name}`}
                xLabels={periodLabels}
                singleFaculty={true}
              />
            </div>
          </div>
        );
      }).filter(Boolean); // Remove null entries

      if (facultyCharts.length > 0) {
        return facultyCharts;
      }

      // If no charts could be built, return a benign placeholder instead of falling back
      return <div key={`${key}-no-data`} className="text-sm text-gray-500">No data to chart for selected periods.</div>;
    }

    // Fallback for non-comparison mode
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

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{question.questionText}</h4>

      {showCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isPeriodComparison ? 
            renderChart(
              null,
              question.questionText,
              question.questionType,
              question._id,
              isPeriodComparison,
              processedFacultyBreakdown,
              periodLabels
            )
          : processedFacultyBreakdown?.map((item, index) => {
            const chartData = getChartData(item.analytics);
            return renderChart(
              chartData,
              question.questionText,
              question.questionType,
              `${question._id}-${index}`,
              false,
              null,
              null
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isPeriodComparison ? (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Faculty
                    </th>
                    {(periodLabels || []).map((label, index) => (
                      <th key={`period-header-${index}`} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {label || `Period ${index + 1}`} ({getHeaderText()})
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faculty
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {getHeaderText()}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isPeriodComparison ? (
                // For period comparison, show faculty-wise metrics side by side
                processedFacultyBreakdown.map((item, idx) => {
                  const numPeriods = (periodLabels || []).length;
                  return (
                    <tr key={item.faculty?._id || `row-${idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.faculty?.name || 'Overall'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.subjects?.join(', ')}
                        </div>
                      </td>
                      {Array.from({ length: numPeriods }).map((_, periodIndex) => {
                        const periodData = item.facultyAnalytics?.[periodIndex] || null;
                        return (
                          <td key={`${item.faculty?._id || 'overall'}-period-${periodIndex}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {periodData ? renderAnalyticsCell(periodData.scale || periodData.analytics || {}) : <span className="text-gray-400">N/A</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                // For regular view, show faculty-wise breakdown
                processedFacultyBreakdown?.map((item, index) => (
                  <tr key={item.faculty ? item.faculty._id : `overall-${question._id}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.faculty ? item.faculty.name : 'Overall'}</div>
                      <div className="text-sm text-gray-500">{item.subjects.join(', ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {renderAnalyticsCell(item.analytics)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuestionFacultyAnalytics;