import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  type?: 'default' | 'positive' | 'negative';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, type = 'default' }) => {
  const getValueClass = () => {
    switch (type) {
      case 'positive':
        return 'profit';
      case 'negative':
        return 'loss';
      default:
        return 'text-gray-900';
    }
  };

  const getSubtitleClass = () => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="metric-card card rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-2xl font-bold ${getValueClass()}`}>{value}</div>
      <div className={`text-xs mt-1 ${getSubtitleClass()}`}>{subtitle}</div>
    </div>
  );
};

const MetricsCards: React.FC = () => {
  const metrics = [
    {
      title: 'Total P&L',
      value: '+$45,678.90',
      subtitle: '+18.7% (30d)',
      type: 'positive' as const
    },
    {
      title: 'Active Bots',
      value: '12',
      subtitle: '8 running, 4 paused',
      type: 'default' as const
    },
    {
      title: 'Win Rate',
      value: '73.2%',
      subtitle: '+2.1% vs last month',
      type: 'positive' as const
    },
    {
      title: 'Total Trades',
      value: '2,847',
      subtitle: 'Last 30 days',
      type: 'default' as const
    },
    {
      title: 'Avg Trade',
      value: '+$16.04',
      subtitle: '+$2.15 vs last month',
      type: 'positive' as const
    },
    {
      title: 'Max Drawdown',
      value: '-2.8%',
      subtitle: 'Improved from -4.1%',
      type: 'positive' as const
    }
  ];

  return (
    <div className="p-6 bg-white border-b border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            type={metric.type}
          />
        ))}
      </div>
    </div>
  );
};

export default MetricsCards;
