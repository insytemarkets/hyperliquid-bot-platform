import React from 'react';

interface PerformanceData {
  id: string;
  strategy: string;
  category: string;
  totalReturn: string;
  sharpe: string;
  maxDrawdown: string;
  winRate: string;
  avgTrade: string;
  trades: number;
  rating: 'excellent' | 'good' | 'average' | 'poor';
}

interface PerformanceTableProps {
  data: PerformanceData[];
  onExportCSV: () => void;
  onGenerateReport: () => void;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({
  data,
  onExportCSV,
  onGenerateReport
}) => {
  const getReturnClass = (value: string) => {
    if (value.startsWith('+')) return 'profit';
    if (value.startsWith('-')) return 'loss';
    return 'text-gray-900';
  };

  const getRatingClass = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'indicator-excellent';
      case 'good':
        return 'indicator-good';
      case 'average':
        return 'indicator-average';
      case 'poor':
        return 'indicator-poor';
      default:
        return 'indicator-average';
    }
  };

  return (
    <div className="card rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h3>
        <div className="flex space-x-2">
          <button 
            className="btn-secondary px-3 py-2 rounded text-sm"
            onClick={onExportCSV}
          >
            Export CSV
          </button>
          <button 
            className="btn-secondary px-3 py-2 rounded text-sm"
            onClick={onGenerateReport}
          >
            Generate Report
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Strategy
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Return
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sharpe
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Max DD
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Win Rate
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Avg Trade
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trades
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="table-row border-b border-gray-100">
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{row.strategy}</div>
                  <div className="text-xs text-gray-500">{row.category}</div>
                </td>
                <td className={`py-4 px-4 text-right font-mono ${getReturnClass(row.totalReturn)}`}>
                  {row.totalReturn}
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-900">
                  {row.sharpe}
                </td>
                <td className={`py-4 px-4 text-right font-mono ${getReturnClass(row.maxDrawdown)}`}>
                  {row.maxDrawdown}
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-900">
                  {row.winRate}
                </td>
                <td className={`py-4 px-4 text-right font-mono ${getReturnClass(row.avgTrade)}`}>
                  {row.avgTrade}
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-600">
                  {row.trades}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`performance-indicator ${getRatingClass(row.rating)}`}>
                    {row.rating.charAt(0).toUpperCase() + row.rating.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceTable;




