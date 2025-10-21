import React from 'react';

interface RiskMetric {
  label: string;
  value: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface RiskMetricsProps {
  metrics: RiskMetric[];
  overallRiskLevel: 'Low' | 'Medium' | 'High';
}

const RiskMetrics: React.FC<RiskMetricsProps> = ({ metrics, overallRiskLevel }) => {
  const getRiskGaugeColor = () => {
    switch (overallRiskLevel) {
      case 'Low':
        return '#10b981';
      case 'Medium':
        return '#f59e0b';
      case 'High':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getValueClass = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-900';
      default:
        return 'text-gray-900';
    }
  };

  const getRiskGaugePosition = () => {
    switch (overallRiskLevel) {
      case 'Low':
        return { x1: '60', y1: '50', x2: '75', y2: '35' };
      case 'Medium':
        return { x1: '60', y1: '50', x2: '45', y2: '30' };
      case 'High':
        return { x1: '60', y1: '50', x2: '30', y2: '35' };
      default:
        return { x1: '60', y1: '50', x2: '45', y2: '30' };
    }
  };

  const gaugePosition = getRiskGaugePosition();

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{metric.label}</span>
            <span className={`font-mono text-sm ${getValueClass(metric.type)}`}>
              {metric.value}
            </span>
          </div>
        ))}
        
        {/* Risk Gauge */}
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-2">Overall Risk Level</div>
          <div className="flex items-center justify-center">
            <div className="risk-gauge">
              <svg viewBox="0 0 120 60" className="w-full h-full">
                <path 
                  d="M 10 50 A 40 40 0 0 1 110 50" 
                  className="gauge-arc gauge-low" 
                  strokeDasharray="20 5"
                />
                <path 
                  d="M 35 25 A 40 40 0 0 1 85 25" 
                  className="gauge-arc gauge-medium" 
                  strokeDasharray="20 5"
                />
                <path 
                  d="M 50 15 A 40 40 0 0 1 70 15" 
                  className="gauge-arc gauge-high" 
                  strokeDasharray="10 5"
                />
                <circle cx="60" cy="50" r="3" fill={getRiskGaugeColor()}/>
                <line 
                  x1={gaugePosition.x1} 
                  y1={gaugePosition.y1} 
                  x2={gaugePosition.x2} 
                  y2={gaugePosition.y2} 
                  stroke={getRiskGaugeColor()} 
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
          <div className={`text-center text-sm font-medium ${
            overallRiskLevel === 'Low' ? 'text-green-600' :
            overallRiskLevel === 'Medium' ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {overallRiskLevel} Risk
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMetrics;
