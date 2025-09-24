import PieChart from './PieChart';
import BarChart from './BarChart';
import HorizontalBarChart from './HorizontalBarChart';
import Histogram from './Histogram';

const QuestionFacultyAnalytics = ({ question, facultyBreakdown, showCharts }) => {

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
        const rawChoiceCounts = analytics.choiceCounts || {};
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

  const renderChart = (data, title) => {
    switch (question.questionType) {
      case 'scale':
        return <Histogram data={data} title={title} />;
      case 'yesno':
        return <PieChart data={data} title={title} />;
      case 'multiplechoice':
        return <BarChart data={data} title={title} />;
      case 'text':
      case 'textarea':
        return <HorizontalBarChart data={data} title={title} />;
      default:
        return <div className="text-center text-gray-500 py-8">No chart available for this question type.</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{question.questionText}</h4>
      </div>

      {showCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facultyBreakdown?.map((item, index) => {
            const chartData = getChartData(item.analytics);
            return renderChart(
              chartData,
              item.faculty ? item.faculty.name : `Overall: ${question.questionText}`,
              item.faculty ? item.faculty._id : `overall-${question._id}-${index}`
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