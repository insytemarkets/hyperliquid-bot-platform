import React from 'react';

interface Template {
  name: string;
  description: string;
  avgReturn: string;
  risk: string;
  badge: string;
  badgeColor: string;
}

const StrategyTemplates: React.FC = () => {
  const templates: Template[] = [
    {
      name: 'Grid Trading',
      description: 'Profit from sideways markets with automated buy/sell orders',
      avgReturn: '+15.2%',
      risk: 'Medium',
      badge: 'Popular',
      badgeColor: 'text-green-600'
    },
    {
      name: 'DCA Strategy',
      description: 'Dollar-cost averaging for long-term accumulation',
      avgReturn: '+22.8%',
      risk: 'Low',
      badge: 'Stable',
      badgeColor: 'text-blue-600'
    },
    {
      name: 'Momentum',
      description: 'Follow trends and momentum for quick profits',
      avgReturn: '+31.5%',
      risk: 'High',
      badge: 'High Risk',
      badgeColor: 'text-orange-600'
    }
  ];

  const handleTemplateSelect = (templateName: string) => {
    console.log(`Selected template: ${templateName}`);
    // TODO: Implement template selection logic
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Templates</h3>
      <div className="space-y-3">
        {templates.map((template, index) => (
          <div 
            key={index}
            className="card-hover border border-gray-200 rounded-lg p-3 cursor-pointer"
            onClick={() => handleTemplateSelect(template.name)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-900">{template.name}</div>
              <div className={`text-xs font-medium ${template.badgeColor}`}>{template.badge}</div>
            </div>
            <div className="text-xs text-gray-500 mb-2">{template.description}</div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg Return: {template.avgReturn}</span>
              <span className="text-gray-500">Risk: {template.risk}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button className="btn-secondary w-full mt-4 py-2 rounded-lg text-sm font-medium">
        View All Templates
      </button>
    </div>
  );
};

export default StrategyTemplates;




