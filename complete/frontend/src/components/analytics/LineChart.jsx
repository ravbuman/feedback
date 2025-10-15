import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({ data, title, xLabels, singleFaculty = false }) => {
  const chartData = {
    labels: xLabels,
    datasets: data.map((dataset) => ({
      label: dataset.label,
      data: dataset.values,
      fill: true,
      borderColor: '#4F46E5', // royal-600
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      tension: 0.3,
      pointBackgroundColor: '#4F46E5',
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointStyle: 'circle',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    })),
  };

  // Find the maximum value across all datasets
  const maxValue = Math.max(
    ...data.map(dataset => dataset.maxValue || 0),
    ...data.flatMap(dataset => dataset.values)
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false  // No legend needed for single-line charts
      },
      title: {
        display: false  // Title is shown above the chart
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            const value = context.parsed.y;
            if (data[0].maxValue === 5) {
              return `Rating: ${value.toFixed(1)}`;
            } else if (data[0].maxValue === 100) {
              return `Percentage: ${value.toFixed(1)}%`;
            } else {
              return `Value: ${value.toFixed(0)}`;
            }
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        bodyFont: {
          size: 12
        },
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: data[0]?.maxValue || 5,
        ticks: {
          stepSize: data[0]?.maxValue === 5 ? 1 :
            data[0]?.maxValue === 100 ? 20 :
              undefined,
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.06)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      line: {
        tension: 0.3
      }
    }
  };

  return (
    <div className="w-full h-[300px] relative">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;