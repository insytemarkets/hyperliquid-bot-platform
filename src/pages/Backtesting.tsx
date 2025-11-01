import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BacktestConfiguration, { BacktestConfig } from '../components/BacktestConfiguration';
import BacktestResults, { BacktestResult } from '../components/BacktestResults';
import BacktestHistory, { HistoricalBacktest } from '../components/BacktestHistory';

const Backtesting: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentResults, setCurrentResults] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState('configuration');

  // Mock historical backtests
  const [backtestHistory] = useState<HistoricalBacktest[]>([
    {
      id: '1',
      strategy: 'Grid Trading Pro',
      pair: 'BTC-USD',
      period: 'Jan 1 - Jun 30, 2024',
      return: 18750,
      returnPercent: 18.75,
      sharpe: 2.34,
      maxDrawdown: -4.2,
      trades: 147,
      runDate: '2024-07-15',
      status: 'completed'
    },
    {
      id: '2',
      strategy: 'Smart DCA',
      pair: 'ETH-USD',
      period: 'Mar 1 - Aug 31, 2024',
      return: 12340,
      returnPercent: 12.34,
      sharpe: 1.87,
      maxDrawdown: -2.8,
      trades: 89,
      runDate: '2024-09-02',
      status: 'completed'
    },
    {
      id: '3',
      strategy: 'Momentum Rider',
      pair: 'SOL-USD',
      period: 'May 1 - Oct 31, 2024',
      return: -2150,
      returnPercent: -2.15,
      sharpe: -0.45,
      maxDrawdown: -8.7,
      trades: 234,
      runDate: '2024-11-01',
      status: 'completed'
    }
  ]);

  const handleRunBacktest = async (config: BacktestConfig) => {
    setIsRunning(true);
    setCurrentResults(null);
    setActiveTab('results');

    // Simulate backtest execution
    setTimeout(() => {
      // Generate mock results based on configuration
      const mockResults: BacktestResult = {
        totalReturn: Math.random() * 20000 - 5000, // Random return between -5k and +15k
        totalReturnPercent: Math.random() * 25 - 5, // Random percentage between -5% and +20%
        sharpeRatio: Math.random() * 3,
        maxDrawdown: -(Math.random() * 10 + 1),
        winRate: Math.random() * 40 + 50, // Between 50% and 90%
        totalTrades: Math.floor(Math.random() * 200 + 50),
        avgTrade: Math.random() * 200 - 50,
        volatility: Math.random() * 20 + 5,
        calmarRatio: Math.random() * 5,
        profitFactor: Math.random() * 3 + 0.5,
        equityCurve: generateMockEquityCurve(config.initialCapital),
        drawdownCurve: generateMockDrawdownCurve(),
        labels: generateDateLabels(config.startDate, config.endDate)
      };

      setCurrentResults(mockResults);
      setIsRunning(false);
    }, 3000); // 3 second delay to simulate processing
  };

  const generateMockEquityCurve = (initialCapital: number) => {
    const points = 50;
    const curve = [initialCapital];
    let current = initialCapital;
    
    for (let i = 1; i < points; i++) {
      const change = (Math.random() - 0.45) * current * 0.02; // Slight upward bias
      current = Math.max(current + change, initialCapital * 0.5); // Don't go below 50% of initial
      curve.push(current);
    }
    
    return curve;
  };

  const generateMockDrawdownCurve = () => {
    const points = 50;
    const curve = [0];
    
    for (let i = 1; i < points; i++) {
      const drawdown = -(Math.random() * 8); // Random drawdown up to -8%
      curve.push(drawdown);
    }
    
    return curve;
  };

  const generateDateLabels = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const labels = [];
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const interval = Math.ceil(totalDays / 50); // 50 data points
    
    for (let i = 0; i < 50; i++) {
      const date = new Date(start.getTime() + (i * interval * 24 * 60 * 60 * 1000));
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  };

  const handleViewBacktest = (backtest: HistoricalBacktest) => {
    // In a real app, this would load the specific backtest results
    console.log('Viewing backtest:', backtest.id);
    setActiveTab('results');
  };

  const handleDeleteBacktest = (id: string) => {
    console.log('Deleting backtest:', id);
    // In a real app, this would remove the backtest from history
  };

  const tabs = [
    { id: 'configuration', name: 'Configuration', icon: '⚙️' },
    { id: 'results', name: 'Results', icon: '📊' },
    { id: 'history', name: 'History', icon: '📋' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Backtesting" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Backtesting" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="flex space-x-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'configuration' && (
              <BacktestConfiguration
                onRunBacktest={handleRunBacktest}
                isRunning={isRunning}
              />
            )}

            {activeTab === 'results' && (
              <BacktestResults
                results={currentResults}
                isLoading={isRunning}
              />
            )}

            {activeTab === 'history' && (
              <BacktestHistory
                backtests={backtestHistory}
                onViewBacktest={handleViewBacktest}
                onDeleteBacktest={handleDeleteBacktest}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Backtesting;


