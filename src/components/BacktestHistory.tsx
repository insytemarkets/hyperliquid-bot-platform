import React from 'react';

export interface HistoricalBacktest {
  id: string;
  strategy: string;
  pair: string;
  period: string;
  return: number;
  returnPercent: number;
  sharpe: number;
  maxDrawdown: number;
  trades: number;
  runDate: string;
  status: 'completed' | 'running' | 'failed';
}

interface BacktestHistoryProps {
  backtests: HistoricalBacktest[];
  onViewBacktest: (backtest: HistoricalBacktest) => void;
  onDeleteBacktest: (id: string) => void;
}

const BacktestHistory: React.FC<BacktestHistoryProps> = ({
  backtests,
  onViewBacktest,
  onDeleteBacktest
}) => {
  const getReturnClass = (value: number) => {
    if (value > 0) return 'profit';
    if (value < 0) return 'loss';
    return 'neutral';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'running':
        return (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Backtest History</h3>
        <div className="text-sm text-gray-500">
          {backtests.length} backtest{backtests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {backtests.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h4 className="text-md font-medium text-gray-900 mb-2">No Backtests Yet</h4>
          <p className="text-gray-500">Run your first backtest to see results here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Strategy
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pair & Period
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Return
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sharpe
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Max DD
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Trades
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {backtests.map((backtest) => (
                <tr key={backtest.id} className="table-row border-b border-gray-100">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{backtest.strategy}</div>
                      <div className="text-xs text-gray-500">{backtest.runDate}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{backtest.pair}</div>
                      <div className="text-xs text-gray-500">{backtest.period}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={`font-mono ${getReturnClass(backtest.return)}`}>
                      ${backtest.return.toLocaleString()}
                    </div>
                    <div className={`text-xs ${getReturnClass(backtest.returnPercent)}`}>
                      {backtest.returnPercent > 0 ? '+' : ''}{backtest.returnPercent.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-gray-900">
                    {backtest.sharpe.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-red-600">
                    {backtest.maxDrawdown.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-gray-600">
                    {backtest.trades}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(backtest.status)}`}>
                      <span className="mr-1">{getStatusIcon(backtest.status)}</span>
                      {backtest.status.charAt(0).toUpperCase() + backtest.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => onViewBacktest(backtest)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        disabled={backtest.status !== 'completed'}
                      >
                        View
                      </button>
                      <button
                        onClick={() => onDeleteBacktest(backtest.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
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

export default BacktestHistory;

