import React, { useState } from 'react';
import { Template } from './TemplateCard';

interface TemplatePreviewProps {
  template: Template | null;
  onCustomizeAndDeploy: (template: Template, parameters: any) => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  onCustomizeAndDeploy
}) => {
  const [parameters, setParameters] = useState({
    tradingPair: 'ETH-USD',
    gridSize: 10,
    gridSpacing: 2.5,
    initialCapital: '$1,000'
  });

  const handleParameterChange = (key: string, value: string | number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getTemplateIcon = (iconType: string) => {
    switch (iconType) {
      case 'grid':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        );
      case 'dca':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        );
      case 'momentum':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        );
      case 'arbitrage':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        );
    }
  };

  const getStrategyCode = (template: Template | null) => {
    if (!template) return '';
    
    switch (template.icon) {
      case 'grid':
        return `// Grid Trading Strategy
if (price_change > grid_spacing) {
    place_sell_order();
}
if (price_change < -grid_spacing) {
    place_buy_order();
}`;
      case 'dca':
        return `// DCA Strategy
if (time_interval_reached()) {
    if (price < moving_average) {
        increase_buy_amount();
    }
    place_buy_order();
}`;
      case 'momentum':
        return `// Momentum Strategy
if (rsi > 70 && volume > avg_volume) {
    place_sell_order();
}
if (rsi < 30 && breakout_detected) {
    place_buy_order();
}`;
      case 'arbitrage':
        return `// Arbitrage Strategy
price_diff = exchange_a_price - exchange_b_price;
if (price_diff > threshold) {
    buy_on_exchange_b();
    sell_on_exchange_a();
}`;
      default:
        return `// Custom Strategy
// Strategy logic will be displayed here
// based on the selected template`;
    }
  };

  if (!template) {
    return (
      <div className="card rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h3>
        <div className="text-sm text-gray-500 mb-4">
          Select a template to see details and customization options
        </div>
        <div className="template-preview">
          <div className="text-center py-12 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p>Click on a template to preview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h3>
      
      <div className="template-preview">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${template.gradient} rounded-lg flex items-center justify-center`}>
            {getTemplateIcon(template.icon)}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-500">{template.category}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trading Pair</label>
            <select 
              className="parameter-input"
              value={parameters.tradingPair}
              onChange={(e) => handleParameterChange('tradingPair', e.target.value)}
            >
              <option value="ETH-USD">ETH-USD</option>
              <option value="BTC-USD">BTC-USD</option>
              <option value="SOL-USD">SOL-USD</option>
              <option value="AVAX-USD">AVAX-USD</option>
              <option value="MATIC-USD">MATIC-USD</option>
            </select>
          </div>
          
          {template.icon === 'grid' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grid Size</label>
                <input 
                  type="number" 
                  className="parameter-input" 
                  value={parameters.gridSize}
                  onChange={(e) => handleParameterChange('gridSize', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grid Spacing (%)</label>
                <input 
                  type="number" 
                  className="parameter-input" 
                  value={parameters.gridSpacing}
                  step="0.1"
                  onChange={(e) => handleParameterChange('gridSpacing', parseFloat(e.target.value))}
                />
              </div>
            </>
          )}
          
          {template.icon === 'dca' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Investment Interval</label>
                <select 
                  className="parameter-input"
                  onChange={(e) => handleParameterChange('interval', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount per Purchase</label>
                <input 
                  type="text" 
                  className="parameter-input" 
                  defaultValue="$100"
                  onChange={(e) => handleParameterChange('purchaseAmount', e.target.value)}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital</label>
            <input 
              type="text" 
              className="parameter-input" 
              value={parameters.initialCapital}
              onChange={(e) => handleParameterChange('initialCapital', e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-6">
          <h5 className="font-medium text-gray-900 mb-2">Strategy Logic Preview</h5>
          <div className="code-block">
            <pre className="text-sm">
              <div className="text-green-400">// {template.name}</div>
              {getStrategyCode(template).split('\n').map((line, index) => (
                <div key={index} className="text-white">
                  {line.includes('//') ? (
                    <span className="text-green-400">{line}</span>
                  ) : line.includes('if') || line.includes('function') ? (
                    <span><span className="text-blue-400">{line.split(' ')[0]}</span> {line.substring(line.indexOf(' '))}</span>
                  ) : (
                    line
                  )}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
      
      <button 
        className="btn-primary w-full mt-6 py-2 rounded-lg font-medium"
        onClick={() => onCustomizeAndDeploy(template, parameters)}
      >
        Customize & Deploy
      </button>
    </div>
  );
};

export default TemplatePreview;


