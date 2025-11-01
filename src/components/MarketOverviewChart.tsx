import React from 'react';

interface MarketOverviewChartProps {
  activeTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  timeframes?: string[];
}

const MarketOverviewChart: React.FC<MarketOverviewChartProps> = ({ 
  activeTimeframe = '1D',
  onTimeframeChange,
  timeframes = ['1H', '4H', '1D', '1W']
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>Market Overview Chart - Coming Soon</p>
      </div>
    </div>
  );
};

export default MarketOverviewChart;
