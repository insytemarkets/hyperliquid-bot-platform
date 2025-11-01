import React, { useState } from 'react';

export interface SentimentIndicator {
  id: string;
  label: string;
  value: string | number;
  percentage: number;
  color: string;
  textColor: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
}

interface MarketSentimentProps {
  indicators?: SentimentIndicator[];
}

const MarketSentiment: React.FC<MarketSentimentProps> = ({ indicators }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Generate realistic sentiment data if not provided
  const defaultIndicators: SentimentIndicator[] = [
    {
      id: '1',
      label: 'Fear & Greed Index',
      value: '74',
      percentage: 74,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      description: 'Greed - Market showing optimism',
      trend: 'up'
    },
    {
      id: '2',
      label: 'Social Sentiment',
      value: 'Bullish',
      percentage: 82,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      description: 'Positive social media sentiment',
      trend: 'up'
    },
    {
      id: '3',
      label: 'Volatility Index',
      value: 'Moderate',
      percentage: 45,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      description: 'Normal market volatility',
      trend: 'neutral'
    },
    {
      id: '4',
      label: 'Funding Rates',
      value: '+0.08%',
      percentage: 65,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      description: 'Positive funding rates',
      trend: 'up'
    }
  ];
  
  const data = indicators || defaultIndicators;
  
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗</span>;
      case 'down':
        return <span className="text-red-500">↘</span>;
      default:
        return <span className="text-gray-500">→</span>;
    }
  };
  
  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Market Sentiment</h3>
        <div className="flex space-x-2">
          {['overview', 'detailed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                activeTab === tab ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        {data.map((indicator) => (
          <div key={indicator.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{indicator.label}</span>
                {getTrendIcon(indicator.trend)}
              </div>
              <span className={`text-sm font-mono font-medium ${indicator.textColor}`}>
                {indicator.value}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-2 ${indicator.color} rounded-full transition-all duration-300`}
                  style={{ width: `${indicator.percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">{indicator.percentage}%</span>
            </div>
            
            {activeTab === 'detailed' && (
              <div className="text-xs text-gray-500 mt-1">
                {indicator.description}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Bullish: 3</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Neutral: 1</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Bearish: 0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;


























