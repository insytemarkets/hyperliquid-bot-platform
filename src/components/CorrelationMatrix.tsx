import React from 'react';

interface CorrelationData {
  assets: string[];
  matrix: number[][];
}

interface CorrelationMatrixProps {
  data: CorrelationData;
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ data }) => {
  const getCorrelationColor = (value: number) => {
    const intensity = Math.abs(value);
    if (intensity >= 0.8) return 'bg-blue-500 text-white';
    if (intensity >= 0.6) return 'bg-blue-400 text-white';
    if (intensity >= 0.4) return 'bg-blue-300 text-white';
    if (intensity >= 0.2) return 'bg-blue-200 text-gray-800';
    return 'bg-blue-100 text-gray-800';
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Correlation</h3>
      <div className="space-y-3">
        {/* Header row */}
        <div className="text-xs text-gray-500 grid grid-cols-6 gap-1">
          <div></div>
          {data.assets.map((asset) => (
            <div key={asset} className="text-center">{asset}</div>
          ))}
        </div>
        
        {/* Matrix rows */}
        {data.matrix.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-1 text-xs">
            <div className="text-gray-500 text-right pr-2">{data.assets[rowIndex]}</div>
            {row.map((value, colIndex) => (
              <div
                key={colIndex}
                className={`correlation-cell ${getCorrelationColor(value)}`}
              >
                {value.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CorrelationMatrix;

