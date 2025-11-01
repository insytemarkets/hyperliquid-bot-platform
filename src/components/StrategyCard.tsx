import React from 'react';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  category: string;
  performance: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Risky';
  thirtyDayReturn: string;
  winRate: string;
  maxDrawdown: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  riskPercentage: number;
  complexity: number; // 1-5
  users: number;
  icon: string;
  gradient: string;
}

interface StrategyCardProps {
  strategy: Strategy;
  onPreview: (strategy: Strategy) => void;
  onDeploy: (strategy: Strategy) => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onPreview,
  onDeploy
}) => {
  const getPerformanceBadgeClass = (performance: string) => {
    switch (performance) {
      case 'Excellent':
        return 'badge-excellent';
      case 'Good':
        return 'badge-good';
      case 'Average':
        return 'badge-average';
      case 'Poor':
      case 'Risky':
        return 'badge-poor';
      default:
        return 'badge-average';
    }
  };

  const getRiskFillClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low':
        return 'risk-low';
      case 'Medium':
        return 'risk-medium';
      case 'High':
      case 'Very High':
        return 'risk-high';
      default:
        return 'risk-medium';
    }
  };

  const getReturnClass = (returnValue: string) => {
    if (returnValue.startsWith('+')) return 'profit';
    if (returnValue.startsWith('-')) return 'loss';
    return 'neutral';
  };

  const getStrategyIcon = (iconType: string) => {
    switch (iconType) {
      case 'grid':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        );
      case 'dca':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        );
      case 'momentum':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        );
      case 'reversion':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        );
      case 'arbitrage':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
          </svg>
        );
      case 'scalping':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        );
    }
  };

  const renderComplexityDots = () => {
    const dots = [];
    for (let i = 1; i <= 5; i++) {
      dots.push(
        <div
          key={i}
          className={`complexity-dot ${i <= strategy.complexity ? 'active' : ''}`}
        />
      );
    }
    return <div className="complexity-dots">{dots}</div>;
  };

  return (
    <div className="strategy-card card rounded-lg p-6 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${strategy.gradient} rounded-lg flex items-center justify-center`}>
            {getStrategyIcon(strategy.icon)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
            <p className="text-sm text-gray-500">{strategy.category}</p>
          </div>
        </div>
        <div className={`performance-badge ${getPerformanceBadgeClass(strategy.performance)}`}>
          {strategy.performance}
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{strategy.description}</p>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">30-Day Return</span>
          <span className={`font-mono text-sm ${getReturnClass(strategy.thirtyDayReturn)}`}>
            {strategy.thirtyDayReturn}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Win Rate</span>
          <span className="font-mono text-sm text-gray-900">{strategy.winRate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Max Drawdown</span>
          <span className={`font-mono text-sm ${getReturnClass(strategy.maxDrawdown)}`}>
            {strategy.maxDrawdown}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Risk Level</span>
          <div className="flex items-center space-x-2">
            <div className="risk-indicator w-16">
              <div 
                className={`risk-fill ${getRiskFillClass(strategy.riskLevel)}`} 
                style={{ width: `${strategy.riskPercentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{strategy.riskLevel}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Complexity</span>
          {renderComplexityDots()}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{strategy.users.toLocaleString()} users</span>
        </div>
        <div className="flex space-x-2">
          <button 
            className="btn-secondary px-3 py-1 rounded text-sm"
            onClick={() => onPreview(strategy)}
          >
            Preview
          </button>
          <button 
            className="btn-primary px-3 py-1 rounded text-sm"
            onClick={() => onDeploy(strategy)}
          >
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyCard;


