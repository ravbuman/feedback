import React from 'react';

const HorizontalBarChart = ({ data, title }) => {
  const colors = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4', '#FFEB3B', '#8BC34A', '#FF9800', '#607D8B'];
  const chartWidth = 400;
  const chartHeight = Math.max(250, data.length * 40); // Adjust height based on number of bars
  const margin = { top: 20, right: 20, bottom: 20, left: 100 }; // Increased left margin for labels
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="p-4 border rounded-lg shadow-sm bg-white">
        <h4 className="font-semibold text-center text-gray-800 mb-4">{title}</h4>
        <div className="text-center text-gray-500 py-8">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barHeight = innerHeight / data.length;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h4 className="font-semibold text-center text-gray-800 mb-4">{title}</h4>
      <div className="flex justify-center items-center">
        <svg width={chartWidth} height={chartHeight}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* X-axis Line */}
            <line x1="0" y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#e0e0e0" />
            {/* Y-axis Line */}
            <line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#e0e0e0" />

            {data.map((d, i) => {
              const barWidth = (d.value / maxValue) * innerWidth;
              const y = i * barHeight;
              const color = colors[i % colors.length];

              return (
                <g key={i}>
                  <rect
                    x={0}
                    y={y + barHeight * 0.1} // Add some padding between bars
                    width={barWidth}
                    height={barHeight * 0.8} // Adjust height for padding
                    fill={color}
                  />
                  {/* Value Label at the end of bar */}
                  {d.value > 0 && (
                    <text
                      x={barWidth + 5}
                      y={y + barHeight / 2 + 5}
                      fontSize="12"
                      fill="#333"
                    >
                      {d.value}
                    </text>
                  )}
                  {/* Y-axis Label (word) */}
                  <text
                    x={-5}
                    y={y + barHeight / 2 + 5}
                    textAnchor="end"
                    fontSize="12"
                    fill="#555"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
            {/* X-axis Max Value Label */}
            <text x={innerWidth} y={innerHeight + 15} textAnchor="end" fontSize="12" fill="#555">{maxValue}</text>
            {/* X-axis 0 Value Label */}
            <text x="0" y={innerHeight + 15} textAnchor="start" fontSize="12" fill="#555">0</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default HorizontalBarChart;
