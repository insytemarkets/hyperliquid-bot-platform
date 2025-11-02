import React from 'react';

export interface Metric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  indicator?: 'excellent' | 'good' | 'average' | 'poor';
  type?: 'positive' | 'negative' | 'warning' | 'neutral';
}

interface MetricCardProps {
  metric: Metric;
  size?: 'small' | 'large';
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, size = 'large' }) => {
  const getCardClass = () => {
    let baseClass = 'metric-card card rounded-lg p-4';
    
    if (metric.type) {
      baseClass += ` ${metric.type}`;
    }
    
    return baseClass;
  };

  const getValueClass = () => {
    if (metric.changeType === 'positive') return 'profit';
    if (metric.changeType === 'negative') return 'loss';
    if (metric.type === 'warning') return 'text-orange-600';
    return 'text-gray-900';
  };

  const getChangeClass = () => {
    if (metric.changeType === 'positive') return 'text-green-600';
    if (metric.changeType === 'negative') return 'text-red-600';
    if (metric.changeType === 'neutral') return 'text-gray-500';
    return 'text-gray-500';
  };

  const getIndicatorClass = () => {
    switch (metric.indicator) {
      case 'excellent':
        return 'indicator-excellent';
      case 'good':
        return 'indicator-good';
      case 'average':
        return 'indicator-average';
      case 'poor':
        return 'indicator-poor';
      default:
        return '';
    }
  };

  return (
    <div className={getCardClass()}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        {metric.label}
      </div>
      <div className={`${size === 'large' ? 'text-2xl' : 'text-lg'} font-bold ${getValueClass()}`}>
        {metric.value}
      </div>
      {metric.change && (
        <div className={`text-xs mt-1 ${getChangeClass()}`}>
          {metric.change}
        </div>
      )}
      {metric.indicator && (
        <div className={`performance-indicator ${getIndicatorClass()}`}>
          {metric.indicator.charAt(0).toUpperCase() + metric.indicator.slice(1)}
        </div>
      )}
    </div>
  );
};

export default MetricCard;




