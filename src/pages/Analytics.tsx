import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MetricCard, { Metric } from '../components/MetricCard';
import PerformanceChart from '../components/PerformanceChart';
import DrawdownChart from '../components/DrawdownChart';
import TradeDistributionChart from '../components/TradeDistributionChart';
import RiskMetrics from '../components/RiskMetrics';
import TopPerformers from '../components/TopPerformers';
import CorrelationMatrix from '../components/CorrelationMatrix';
import MonthlyReturns from '../components/MonthlyReturns';
import PerformanceTable from '../components/PerformanceTable';

const Analytics: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState('Performance');
  const [performanceChartTab, setPerformanceChartTab] = useState('Cumulative');
  const [tradeDistTab, setTradeDistTab] = useState('P&L');
  const [dateRange, setDateRange] = useState({
    from: '2024-01-01',
    to: '2024-01-31'
  });

  // Mock data
  const keyMetrics: Metric[] = [
    {
      label: 'Total Return',
      value: '+$45,678.90',
      change: '+18.7% (30d)',
      changeType: 'positive',
      type: 'positive'
    },
    {
      label: 'Sharpe Ratio',
      value: '2.34',
      indicator: 'excellent'
    },
    {
      label: 'Max Drawdown',
      value: '-4.2%',
      change: 'Within limits',
      changeType: 'neutral',
      type: 'warning'
    },
    {
      label: 'Win Rate',
      value: '73.2%',
      change: 'Above average',
      changeType: 'positive',
      type: 'positive'
    },
    {
      label: 'Volatility',
      value: '12.8%',
      change: 'Annualized',
      changeType: 'neutral'
    },
    {
      label: 'Alpha',
      value: '+5.7%',
      change: 'vs benchmark',
      changeType: 'positive',
      type: 'positive'
    }
  ];

  const riskMetrics = [
    { label: 'Value at Risk (95%)', value: '-$2,340', type: 'negative' as const },
    { label: 'Expected Shortfall', value: '-$3,120', type: 'negative' as const },
    { label: 'Beta', value: '0.87', type: 'neutral' as const },
    { label: 'Information Ratio', value: '1.45', type: 'positive' as const },
    { label: 'Calmar Ratio', value: '4.45', type: 'positive' as const }
  ];

  const topPerformers = [
    {
      id: '1',
      name: 'BTC DCA Pro',
      strategy: 'DCA Strategy',
      return: '+18.9%',
      trades: 89,
      type: 'positive' as const
    },
    {
      id: '2',
      name: 'ETH Grid Master',
      strategy: 'Grid Trading',
      return: '+12.3%',
      trades: 147,
      type: 'positive' as const
    },
    {
      id: '3',
      name: 'SOL Scalper',
      strategy: 'Momentum',
      return: '-2.3%',
      trades: 234,
      type: 'negative' as const
    }
  ];

  const correlationData = {
    assets: ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'],
    matrix: [
      [1.00, 0.87, 0.72, 0.65, 0.58],
      [0.87, 1.00, 0.81, 0.74, 0.67],
      [0.72, 0.81, 1.00, 0.89, 0.76],
      [0.65, 0.74, 0.89, 1.00, 0.82],
      [0.58, 0.67, 0.76, 0.82, 1.00]
    ]
  };

  const monthlyReturns = [
    { month: 'Jan', return: 5.2 },
    { month: 'Feb', return: 3.8 },
    { month: 'Mar', return: -1.2 },
    { month: 'Apr', return: 7.1 },
    { month: 'May', return: 2.4 },
    { month: 'Jun', return: 4.9 }
  ];

  const performanceTableData = [
    {
      id: '1',
      strategy: 'BTC DCA Pro',
      category: 'DCA Strategy',
      totalReturn: '+18.9%',
      sharpe: '2.45',
      maxDrawdown: '-2.1%',
      winRate: '82.0%',
      avgTrade: '+$89.12',
      trades: 89,
      rating: 'excellent' as const
    },
    {
      id: '2',
      strategy: 'ETH Grid Master',
      category: 'Grid Trading',
      totalReturn: '+12.3%',
      sharpe: '1.87',
      maxDrawdown: '-4.2%',
      winRate: '78.2%',
      avgTrade: '+$15.96',
      trades: 147,
      rating: 'good' as const
    },
    {
      id: '3',
      strategy: 'Multi-Pair Grid',
      category: 'Grid Trading',
      totalReturn: '+9.4%',
      sharpe: '1.52',
      maxDrawdown: '-3.8%',
      winRate: '71.8%',
      avgTrade: '+$5.02',
      trades: 312,
      rating: 'average' as const
    },
    {
      id: '4',
      strategy: 'SOL Scalper',
      category: 'Momentum',
      totalReturn: '-2.3%',
      sharpe: '-0.34',
      maxDrawdown: '-8.7%',
      winRate: '65.4%',
      avgTrade: '-$1.00',
      trades: 234,
      rating: 'poor' as const
    }
  ];

  const mainTabs = ['Performance', 'Risk Analysis', 'Trade Analysis', 'Correlation', 'Attribution'];
  const performanceChartTabs = ['Cumulative', 'Daily', 'Rolling'];
  const tradeDistTabs = ['P&L', 'Duration', 'Size'];

  const handleExportReport = () => {
    console.log('Exporting report...');
    // TODO: Generate and download report
  };

  const handleExportCSV = () => {
    console.log('Exporting CSV...');
    // TODO: Export table data as CSV
  };

  const handleGenerateReport = () => {
    console.log('Generating detailed report...');
    // TODO: Generate comprehensive report
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Analytics" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Analytics" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Key Metrics */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {keyMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Analytics Tabs */}
            <div className="flex space-x-2 mb-6">
              {mainTabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 rounded text-sm ${
                    activeMainTab === tab ? 'tab-active' : 'tab-inactive'
                  }`}
                  onClick={() => setActiveMainTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Charts Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Portfolio Performance Chart */}
                <PerformanceChart
                  title="Portfolio Performance"
                  activeTab={performanceChartTab}
                  onTabChange={setPerformanceChartTab}
                  tabs={performanceChartTabs}
                />

                {/* Drawdown Analysis */}
                <DrawdownChart
                  currentDrawdown="-1.2%"
                  maxDrawdown="-4.2%"
                />

                {/* Trade Distribution */}
                <TradeDistributionChart
                  activeTab={tradeDistTab}
                  onTabChange={setTradeDistTab}
                  tabs={tradeDistTabs}
                />
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Risk Metrics */}
                <RiskMetrics
                  metrics={riskMetrics}
                  overallRiskLevel="Medium"
                />

                {/* Top Performing Strategies */}
                <TopPerformers performers={topPerformers} />

                {/* Correlation Matrix */}
                <CorrelationMatrix data={correlationData} />

                {/* Monthly Performance */}
                <MonthlyReturns returns={monthlyReturns} />
              </div>
            </div>

            {/* Detailed Analytics Table */}
            <PerformanceTable
              data={performanceTableData}
              onExportCSV={handleExportCSV}
              onGenerateReport={handleGenerateReport}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;




