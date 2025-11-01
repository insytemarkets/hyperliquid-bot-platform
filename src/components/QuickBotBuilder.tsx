import React, { useState } from 'react';

const QuickBotBuilder: React.FC = () => {
  const [formData, setFormData] = useState({
    strategy: 'Grid Trading',
    pair: 'ETH-USD',
    capital: '$1,000',
    risk: 'Conservative'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (action: 'create' | 'save' | 'backtest') => {
    console.log(`${action} bot with data:`, formData);
    // TODO: Implement bot creation logic with Hyperliquid SDK
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Bot Builder</h3>
        <button className="btn-secondary px-3 py-1 rounded text-sm">Advanced Builder</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Template</label>
          <select 
            className="form-input w-full px-3 py-2 rounded-lg"
            value={formData.strategy}
            onChange={(e) => handleInputChange('strategy', e.target.value)}
          >
            <option>Grid Trading</option>
            <option>DCA (Dollar Cost Average)</option>
            <option>Momentum Scalping</option>
            <option>Mean Reversion</option>
            <option>Arbitrage</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trading Pair</label>
          <select 
            className="form-input w-full px-3 py-2 rounded-lg"
            value={formData.pair}
            onChange={(e) => handleInputChange('pair', e.target.value)}
          >
            <option>ETH-USD</option>
            <option>BTC-USD</option>
            <option>SOL-USD</option>
            <option>AVAX-USD</option>
            <option>MATIC-USD</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital</label>
          <input 
            type="text" 
            className="form-input w-full px-3 py-2 rounded-lg" 
            placeholder="$1,000"
            value={formData.capital}
            onChange={(e) => handleInputChange('capital', e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
          <select 
            className="form-input w-full px-3 py-2 rounded-lg"
            value={formData.risk}
            onChange={(e) => handleInputChange('risk', e.target.value)}
          >
            <option>Conservative</option>
            <option>Moderate</option>
            <option>Aggressive</option>
            <option>Custom</option>
          </select>
        </div>
      </div>
      
      <div className="mt-6 flex space-x-3">
        <button 
          className="btn-primary px-6 py-2 rounded-lg font-medium"
          onClick={() => handleSubmit('create')}
        >
          Create & Deploy
        </button>
        <button 
          className="btn-secondary px-6 py-2 rounded-lg font-medium"
          onClick={() => handleSubmit('save')}
        >
          Save as Draft
        </button>
        <button 
          className="btn-secondary px-6 py-2 rounded-lg font-medium"
          onClick={() => handleSubmit('backtest')}
        >
          Backtest First
        </button>
      </div>
    </div>
  );
};

export default QuickBotBuilder;


