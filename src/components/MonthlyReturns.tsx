import React from 'react';

interface MonthlyReturn {
  month: string;
  return: number;
}

interface MonthlyReturnsProps {
  returns: MonthlyReturn[];
}

const MonthlyReturns: React.FC<MonthlyReturnsProps> = ({ returns }) => {
  const getHeatmapColor = (returnValue: number) => {
    if (returnValue > 5) return 'bg-green-600 text-white';
    if (returnValue > 3) return 'bg-green-500 text-white';
    if (returnValue > 1) return 'bg-green-400 text-white';
    if (returnValue > 0) return 'bg-green-300 text-white';
    if (returnValue > -2) return 'bg-red-300 text-white';
    if (returnValue > -4) return 'bg-red-400 text-white';
    return 'bg-red-500 text-white';
  };

  const formatReturn = (value: number) => {
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Returns</h3>
      <div className="grid grid-cols-3 gap-2">
        {returns.map((monthData, index) => (
          <div
            key={index}
            className={`heatmap-cell ${getHeatmapColor(monthData.return)} p-2 rounded text-center text-xs`}
          >
            <div className="font-medium">{monthData.month}</div>
            <div>{formatReturn(monthData.return)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyReturns;
