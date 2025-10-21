import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface BacktestResult {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgTrade: number;
  volatility: number;
  calmarRatio: number;
  profitFactor: number;
  equityCurve: number[];
  drawdownCurve: number[];
  labels: string[];
}

interface BacktestResultsProps {
  results: BacktestResult | null;
  isLoading: boolean;
}

const BacktestResults: React.FC<BacktestResultsProps> = ({
  results,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="card rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Running backtest...</div>
            <div className="text-sm text-gray-500 mt-2">This may take a few moments</div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
            <p className="text-gray-500">Configure your backtest parameters and click "Run Backtest" to see results.</p>
          </div>
        </div>
      </div>
    );
  }

  const equityData = {
    labels: results.labels,
    datasets: [{
      label: 'Portfolio Value',
      data: results.equityCurve,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    }]
  };

  const drawdownData = {
    labels: results.labels,
    datasets: [{
      label: 'Drawdown',
      data: results.drawdownCurve,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { 
          color: '#6b7280', 
          font: { size: 11 }
        }
      }
    }
  };

  const getReturnClass = (value: number) => {
    if (value > 0) return 'profit';
    if (value < 0) return 'loss';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Backtest Results</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Return</div>
            <div className={`text-2xl font-bold ${getReturnClass(results.totalReturn)}`}>
              ${results.totalReturn.toLocaleString()}
            </div>
            <div className={`text-sm ${getReturnClass(results.totalReturnPercent)}`}>
              {results.totalReturnPercent > 0 ? '+' : ''}{results.totalReturnPercent.toFixed(2)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sharpe Ratio</div>
            <div className="text-2xl font-bold text-gray-900">{results.sharpeRatio.toFixed(2)}</div>
            <div className="text-sm text-gray-500">
              {results.sharpeRatio > 1 ? 'Excellent' : results.sharpeRatio > 0.5 ? 'Good' : 'Poor'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Max Drawdown</div>
            <div className="text-2xl font-bold text-red-600">{results.maxDrawdown.toFixed(2)}%</div>
            <div className="text-sm text-gray-500">Peak to trough</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-gray-900">{results.winRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">{results.totalTrades} trades</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <div className="card rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Equity Curve</h4>
          <div className="h-64">
            <Line data={equityData} options={chartOptions} />
          </div>
        </div>

        {/* Drawdown Chart */}
        <div className="card rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Drawdown</h4>
          <div className="h-64">
            <Line data={drawdownData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="card rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Detailed Metrics</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600">Average Trade</div>
            <div className={`font-mono text-lg ${getReturnClass(results.avgTrade)}`}>
              ${results.avgTrade.toFixed(2)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Volatility</div>
            <div className="font-mono text-lg text-gray-900">
              {results.volatility.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Calmar Ratio</div>
            <div className="font-mono text-lg text-gray-900">
              {results.calmarRatio.toFixed(2)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Profit Factor</div>
            <div className="font-mono text-lg text-gray-900">
              {results.profitFactor.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestResults;
