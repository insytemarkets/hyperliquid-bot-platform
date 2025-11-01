import React, { useState } from 'react';

interface BacktestResult {
  period: string;
  totalReturn: string;
  winRate: string;
  maxDrawdown: string;
  sharpeRatio: string;
  totalTrades: number;
}

interface BacktestPreviewProps {
  onFullBacktest: () => void;
}

const BacktestPreview: React.FC<BacktestPreviewProps> = ({ onFullBacktest }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock backtest data - this would come from actual backtesting
  const backtestResult: BacktestResult = {
    period: '30 days',
    totalReturn: '+12.4%',
    winRate: '68.2%',
    maxDrawdown: '-3.1%',
    sharpeRatio: '1.85',
    totalTrades: 47
  };

  const handleQuickBacktest = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const getReturnClass = (value: string) => {
    if (value.startsWith('+')) return 'text-green-600';
    if (value.startsWith('-')) return 'text-red-600';
    return 'text-gray-900';
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Backtest</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Running backtest...</span>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Period</span>
            <span className="font-mono text-gray-900">{backtestResult.period}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Return</span>
            <span className={`font-mono ${getReturnClass(backtestResult.totalReturn)}`}>
              {backtestResult.totalReturn}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Win Rate</span>
            <span className="font-mono text-gray-900">{backtestResult.winRate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Max Drawdown</span>
            <span className={`font-mono ${getReturnClass(backtestResult.maxDrawdown)}`}>
              {backtestResult.maxDrawdown}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sharpe Ratio</span>
            <span className="font-mono text-gray-900">{backtestResult.sharpeRatio}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Trades</span>
            <span className="font-mono text-gray-900">{backtestResult.totalTrades}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <button 
          className="btn-primary w-full py-2 rounded-lg text-sm font-medium"
          onClick={handleQuickBacktest}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Quick Backtest'}
        </button>
        
        <button 
          className="btn-secondary w-full py-2 rounded-lg text-sm font-medium"
          onClick={onFullBacktest}
        >
          Full Backtest
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-800 font-medium mb-1">Backtest Settings</div>
        <div className="text-xs text-blue-700">
          • Historical data: Last 30 days<br/>
          • Initial capital: $5,000<br/>
          • Commission: 0.1% per trade
        </div>
      </div>
    </div>
  );
};

export default BacktestPreview;


