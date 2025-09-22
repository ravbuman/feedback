import React from 'react';

const PieChart = ({ data, title }) => {
  const colors = ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF'];
  const total = data.reduce((acc, d) => acc + d.value, 0);
  let cumulative = 0;

  if (total === 0) {
    return (
      <div className="text-center p-4">
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const radius = 90; // slightly smaller than SVG size so padding exists
  const center = 100;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h4 className="font-semibold text-center text-gray-800 mb-4">{title}</h4>
      <div className="flex justify-center items-center">
        <svg width="200" height="200" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
          {data.map((d, i) => {
            const startAngle = (cumulative / total) * 2 * Math.PI;
            const endAngle = ((cumulative + d.value) / total) * 2 * Math.PI;
            cumulative += d.value;

            const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
            const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
            const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
            const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);

            const largeArcFlag = d.value / total > 0.5 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
                fill={colors[i % colors.length]}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <span
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: colors[i % colors.length] }}
              ></span>
              <span>{d.label}</span>
            </div>
            <span className="font-semibold">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
