import React from 'react';

const Histogram = ({ data, title }) => {
  const colors = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4', '#FFEB3B', '#8BC34A', '#FF9800', '#607D8B'];
  const chartWidth = 400;
  const chartHeight = 250;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
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
  const barWidth = innerWidth / data.length;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h4 className="font-semibold text-center text-gray-800 mb-4">{title}</h4>
      <div className="flex justify-center items-center">
        <svg width={chartWidth} height={chartHeight}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Y-axis Line */}
            <line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#e0e0e0" />
            {/* X-axis Line */}
            <line x1="0" y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#e0e0e0" />

            {data.map((d, i) => {
              const barHeight = (d.value / maxValue) * innerHeight;
              const x = i * barWidth;
              const y = innerHeight - barHeight;
              const color = colors[i % colors.length];

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                  {/* Value Label on top of bar */}
                  {d.value > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                    >
                      {d.value}
                    </text>
                  )}
                  {/* X-axis Label (rating) */}
                  <text
                    x={x + barWidth / 2}
                    y={innerHeight + 15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#555"
                  >
                    {d.label.replace('Rating ', '')}
                  </text>
                </g>
              );
            })}
            {/* Y-axis Max Value Label */}
            <text x="-10" y="10" textAnchor="end" fontSize="12" fill="#555">{maxValue}</text>
            {/* Y-axis 0 Value Label */}
            <text x="-10" y={innerHeight + 5} textAnchor="end" fontSize="12" fill="#555">0</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default Histogram;
