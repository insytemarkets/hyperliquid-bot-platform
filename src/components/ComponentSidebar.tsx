import React from 'react';

interface ComponentItem {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ComponentSidebar: React.FC = () => {
  const components: ComponentItem[] = [
    {
      type: 'trigger',
      title: 'Price Trigger',
      description: 'Market conditions',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
        </svg>
      )
    },
    {
      type: 'indicator',
      title: 'Technical Indicator',
      description: 'RSI, MACD, etc.',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
      )
    },
    {
      type: 'condition',
      title: 'Logic Condition',
      description: 'AND, OR, NOT',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      )
    },
    {
      type: 'action',
      title: 'Trade Action',
      description: 'Buy, Sell, Close',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
        </svg>
      )
    }
  ];

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('text/plain', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-4 border-t border-gray-700 mt-8">
      <div className="space-y-3">
        <div className="text-xs text-gray-400 uppercase tracking-wider">Strategy Components</div>
        <div className="space-y-2">
          {components.map((component) => (
            <div
              key={component.type}
              className="bg-gray-700 rounded p-2 cursor-pointer hover:bg-gray-600 transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, component.type)}
            >
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-4 h-4 flex items-center justify-center">
                  {component.icon}
                </div>
                <div className="text-xs font-medium text-white">{component.title}</div>
              </div>
              <div className="text-xs text-gray-400">{component.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComponentSidebar;


