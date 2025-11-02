import React, { useState } from 'react';

interface BacktestConfigProps {
  onRunBacktest: (config: BacktestConfig) => void;
  isRunning: boolean;
}

export interface BacktestConfig {
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  tradingPair: string;
  timeframe: string;
  commission: number;
  slippage: number;
}

const BacktestConfiguration: React.FC<BacktestConfigProps> = ({
  onRunBacktest,
  isRunning
}) => {
  const [config, setConfig] = useState<BacktestConfig>({
    strategy: 'grid-trading',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    initialCapital: 10000,
    tradingPair: 'BTC-USD',
    timeframe: '1h',
    commission: 0.1,
    slippage: 0.05
  });

  const handleInputChange = (field: keyof BacktestConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunBacktest(config);
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Backtest Configuration</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strategy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy
            </label>
            <select
              value={config.strategy}
              onChange={(e) => handleInputChange('strategy', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="grid-trading">Grid Trading Pro</option>
              <option value="dca">Smart DCA</option>
              <option value="momentum">Momentum Rider</option>
              <option value="mean-reversion">Mean Reversion</option>
              <option value="arbitrage">Cross-Exchange Arb</option>
            </select>
          </div>

          {/* Trading Pair */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trading Pair
            </label>
            <select
              value={config.tradingPair}
              onChange={(e) => handleInputChange('tradingPair', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="BTC-USD">BTC-USD</option>
              <option value="ETH-USD">ETH-USD</option>
              <option value="SOL-USD">SOL-USD</option>
              <option value="AVAX-USD">AVAX-USD</option>
              <option value="MATIC-USD">MATIC-USD</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Initial Capital */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Capital ($)
            </label>
            <input
              type="number"
              value={config.initialCapital}
              onChange={(e) => handleInputChange('initialCapital', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="100"
              step="100"
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <select
              value={config.timeframe}
              onChange={(e) => handleInputChange('timeframe', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission (%)
            </label>
            <input
              type="number"
              value={config.commission}
              onChange={(e) => handleInputChange('commission', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="1"
              step="0.01"
            />
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slippage (%)
            </label>
            <input
              type="number"
              value={config.slippage}
              onChange={(e) => handleInputChange('slippage', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isRunning}
            className={`px-6 py-2 rounded-lg text-sm font-medium ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {isRunning ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Running Backtest...</span>
              </div>
            ) : (
              'Run Backtest'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BacktestConfiguration;




