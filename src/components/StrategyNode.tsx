import React from 'react';

export interface StrategyNodeData {
  id: string;
  type: 'trigger' | 'indicator' | 'condition' | 'action';
  title: string;
  description: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
  connectors: {
    inputs: number;
    outputs: number;
  };
}

interface StrategyNodeProps {
  node: StrategyNodeData;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onParameterChange: (nodeId: string, parameter: string, value: any) => void;
  onPositionChange: (nodeId: string, position: { x: number; y: number }) => void;
}

const StrategyNode: React.FC<StrategyNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onParameterChange,
  onPositionChange
}) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return 'bg-green-500';
      case 'indicator':
        return 'bg-blue-500';
      case 'condition':
        return 'bg-purple-500';
      case 'action':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderConnectors = () => {
    const connectors = [];
    
    // Input connectors (left side)
    for (let i = 0; i < node.connectors.inputs; i++) {
      const top = node.connectors.inputs === 1 ? '50%' : `${25 + (i * 50)}%`;
      connectors.push(
        <div
          key={`input-${i}`}
          className="node-connector"
          style={{
            top,
            left: '-6px',
            transform: 'translateY(-50%)'
          }}
        />
      );
    }
    
    // Output connectors (right side)
    for (let i = 0; i < node.connectors.outputs; i++) {
      const top = node.connectors.outputs === 1 ? '50%' : `${25 + (i * 50)}%`;
      connectors.push(
        <div
          key={`output-${i}`}
          className="node-connector"
          style={{
            top,
            right: '-6px',
            transform: 'translateY(-50%)'
          }}
        />
      );
    }
    
    return connectors;
  };

  const renderParameters = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Price Above:</label>
              <input
                type="text"
                className="parameter-input text-xs w-16"
                value={node.parameters.priceAbove || '$3400'}
                onChange={(e) => onParameterChange(node.id, 'priceAbove', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Timeframe:</label>
              <select
                className="parameter-input text-xs w-16"
                value={node.parameters.timeframe || '5m'}
                onChange={(e) => onParameterChange(node.id, 'timeframe', e.target.value)}
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
              </select>
            </div>
          </div>
        );
      
      case 'indicator':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Period:</label>
              <input
                type="text"
                className="parameter-input text-xs w-12"
                value={node.parameters.period || '14'}
                onChange={(e) => onParameterChange(node.id, 'period', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Condition:</label>
              <select
                className="parameter-input text-xs w-20"
                value={node.parameters.condition || '> 70'}
                onChange={(e) => onParameterChange(node.id, 'condition', e.target.value)}
              >
                <option value="< 30">&lt; 30</option>
                <option value="> 70">&gt; 70</option>
                <option value="30-70">30-70</option>
              </select>
            </div>
          </div>
        );
      
      case 'condition':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Both conditions must be true</div>
          </div>
        );
      
      case 'action':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Amount:</label>
              <input
                type="text"
                className="parameter-input text-xs w-16"
                value={node.parameters.amount || '$500'}
                onChange={(e) => onParameterChange(node.id, 'amount', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">Type:</label>
              <select
                className="parameter-input text-xs w-20"
                value={node.parameters.orderType || 'Market'}
                onChange={(e) => onParameterChange(node.id, 'orderType', e.target.value)}
              >
                <option value="Market">Market</option>
                <option value="Limit">Limit</option>
                <option value="Stop">Stop</option>
              </select>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className={`strategy-node ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        top: `${node.position.y}px`,
        left: `${node.position.x}px`
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {renderConnectors()}
      
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-3 h-3 ${getNodeColor(node.type)} rounded-full`}></div>
        <div className="font-medium text-sm">{node.title}</div>
      </div>
      
      <div className="text-xs text-gray-500 mb-3">{node.description}</div>
      
      {renderParameters()}
    </div>
  );
};

export default StrategyNode;




