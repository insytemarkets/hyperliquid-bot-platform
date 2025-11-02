import React from 'react';
import { StrategyNodeData } from './StrategyNode';

interface NodePropertiesPanelProps {
  selectedNode: StrategyNodeData | null;
  onNodeUpdate: (nodeId: string, updates: Partial<StrategyNodeData>) => void;
}

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  selectedNode,
  onNodeUpdate
}) => {
  const handleParameterChange = (parameter: string, value: any) => {
    if (!selectedNode) return;
    
    const updatedParameters = { ...selectedNode.parameters, [parameter]: value };
    onNodeUpdate(selectedNode.id, { parameters: updatedParameters });
  };

  const renderNodeProperties = () => {
    if (!selectedNode) {
      return (
        <div className="text-sm text-gray-500 mb-4">
          Select a node to edit its properties
        </div>
      );
    }

    switch (selectedNode.type) {
      case 'trigger':
        return (
          <div className="p-3 bg-gray-50 rounded border">
            <div className="font-medium text-sm text-gray-900 mb-2">Price Trigger</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asset</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.asset || 'ETH-USD'}
                  onChange={(e) => handleParameterChange('asset', e.target.value)}
                >
                  <option value="ETH-USD">ETH-USD</option>
                  <option value="BTC-USD">BTC-USD</option>
                  <option value="SOL-USD">SOL-USD</option>
                  <option value="AVAX-USD">AVAX-USD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.conditionType || 'Price Above'}
                  onChange={(e) => handleParameterChange('conditionType', e.target.value)}
                >
                  <option value="Price Above">Price Above</option>
                  <option value="Price Below">Price Below</option>
                  <option value="Price Change %">Price Change %</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                <input 
                  type="text" 
                  className="form-input w-full px-2 py-1 text-sm rounded" 
                  value={selectedNode.parameters.priceAbove || '$3400'}
                  onChange={(e) => handleParameterChange('priceAbove', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Timeframe</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.timeframe || '5m'}
                  onChange={(e) => handleParameterChange('timeframe', e.target.value)}
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'indicator':
        return (
          <div className="p-3 bg-gray-50 rounded border">
            <div className="font-medium text-sm text-gray-900 mb-2">Technical Indicator</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Indicator Type</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.indicatorType || 'RSI'}
                  onChange={(e) => handleParameterChange('indicatorType', e.target.value)}
                >
                  <option value="RSI">RSI</option>
                  <option value="MACD">MACD</option>
                  <option value="SMA">SMA</option>
                  <option value="EMA">EMA</option>
                  <option value="Bollinger Bands">Bollinger Bands</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                <input 
                  type="number" 
                  className="form-input w-full px-2 py-1 text-sm rounded" 
                  value={selectedNode.parameters.period || '14'}
                  onChange={(e) => handleParameterChange('period', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.condition || '> 70'}
                  onChange={(e) => handleParameterChange('condition', e.target.value)}
                >
                  <option value="< 30">&lt; 30 (Oversold)</option>
                  <option value="> 70">&gt; 70 (Overbought)</option>
                  <option value="30-70">30-70 (Neutral)</option>
                  <option value="Crossover">Crossover</option>
                  <option value="Crossunder">Crossunder</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="p-3 bg-gray-50 rounded border">
            <div className="font-medium text-sm text-gray-900 mb-2">Logic Condition</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Logic Type</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.logicType || 'AND'}
                  onChange={(e) => handleParameterChange('logicType', e.target.value)}
                >
                  <option value="AND">AND (All conditions must be true)</option>
                  <option value="OR">OR (Any condition can be true)</option>
                  <option value="NOT">NOT (Invert condition)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="form-input w-full px-2 py-1 text-sm rounded" 
                  rows={2}
                  value={selectedNode.parameters.description || 'Both conditions must be true'}
                  onChange={(e) => handleParameterChange('description', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 'action':
        return (
          <div className="p-3 bg-gray-50 rounded border">
            <div className="font-medium text-sm text-gray-900 mb-2">Trade Action</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.actionType || 'Buy'}
                  onChange={(e) => handleParameterChange('actionType', e.target.value)}
                >
                  <option value="Buy">Buy Order</option>
                  <option value="Sell">Sell Order</option>
                  <option value="Close">Close Position</option>
                  <option value="Stop Loss">Stop Loss</option>
                  <option value="Take Profit">Take Profit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input 
                  type="text" 
                  className="form-input w-full px-2 py-1 text-sm rounded" 
                  value={selectedNode.parameters.amount || '$500'}
                  onChange={(e) => handleParameterChange('amount', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Order Type</label>
                <select 
                  className="form-input w-full px-2 py-1 text-sm rounded"
                  value={selectedNode.parameters.orderType || 'Market'}
                  onChange={(e) => handleParameterChange('orderType', e.target.value)}
                >
                  <option value="Market">Market Order</option>
                  <option value="Limit">Limit Order</option>
                  <option value="Stop">Stop Order</option>
                  <option value="Stop Limit">Stop Limit</option>
                </select>
              </div>
              {selectedNode.parameters.orderType === 'Limit' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Limit Price</label>
                  <input 
                    type="text" 
                    className="form-input w-full px-2 py-1 text-sm rounded" 
                    value={selectedNode.parameters.limitPrice || ''}
                    onChange={(e) => handleParameterChange('limitPrice', e.target.value)}
                    placeholder="Enter limit price"
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Unknown node type: {selectedNode.type}
          </div>
        );
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Properties</h3>
      <div id="nodeProperties">
        {renderNodeProperties()}
      </div>
    </div>
  );
};

export default NodePropertiesPanel;




