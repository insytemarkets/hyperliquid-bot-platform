import React from 'react';
import { StrategyNodeData } from './StrategyNode';

interface ValidationResult {
  type: 'success' | 'warning' | 'error';
  message: string;
}

interface StrategyValidationProps {
  nodes: StrategyNodeData[];
  connections: any[];
  onValidate: () => void;
}

const StrategyValidation: React.FC<StrategyValidationProps> = ({
  nodes,
  connections,
  onValidate
}) => {
  const validateStrategy = (): ValidationResult[] => {
    const results: ValidationResult[] = [];

    // Check if there are any nodes
    if (nodes.length === 0) {
      results.push({
        type: 'error',
        message: 'No strategy components added'
      });
      return results;
    }

    // Check for trigger nodes
    const triggerNodes = nodes.filter(node => node.type === 'trigger');
    if (triggerNodes.length === 0) {
      results.push({
        type: 'error',
        message: 'At least one trigger is required'
      });
    } else {
      results.push({
        type: 'success',
        message: 'Trigger nodes present'
      });
    }

    // Check for action nodes
    const actionNodes = nodes.filter(node => node.type === 'action');
    if (actionNodes.length === 0) {
      results.push({
        type: 'error',
        message: 'At least one action is required'
      });
    } else {
      results.push({
        type: 'success',
        message: 'Action nodes present'
      });
    }

    // Check connections
    if (connections.length > 0) {
      results.push({
        type: 'success',
        message: 'All nodes connected'
      });
    } else if (nodes.length > 1) {
      results.push({
        type: 'warning',
        message: 'Nodes not connected'
      });
    }

    // Check for logic flow
    const hasLogicFlow = nodes.some(node => node.type === 'condition') || nodes.length <= 2;
    if (hasLogicFlow) {
      results.push({
        type: 'success',
        message: 'Logic flow valid'
      });
    } else {
      results.push({
        type: 'warning',
        message: 'Consider adding logic conditions'
      });
    }

    // Check risk parameters
    const hasRiskManagement = actionNodes.some(node => 
      node.parameters.orderType === 'Stop' || 
      node.parameters.actionType === 'Stop Loss'
    );
    
    if (hasRiskManagement) {
      results.push({
        type: 'success',
        message: 'Risk parameters set'
      });
    } else {
      results.push({
        type: 'warning',
        message: 'Risk parameters recommended'
      });
    }

    // Check for stop loss
    const hasStopLoss = actionNodes.some(node => node.parameters.actionType === 'Stop Loss');
    if (hasStopLoss) {
      results.push({
        type: 'success',
        message: 'Stop loss configured'
      });
    } else {
      results.push({
        type: 'error',
        message: 'Stop loss missing'
      });
    }

    return results;
  };

  const validationResults = validateStrategy();

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const getOverallStatus = () => {
    const hasErrors = validationResults.some(result => result.type === 'error');
    const hasWarnings = validationResults.some(result => result.type === 'warning');
    
    if (hasErrors) return 'error';
    if (hasWarnings) return 'warning';
    return 'success';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="card rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Validation</h3>
      
      <div className="space-y-3 mb-4">
        {validationResults.map((result, index) => (
          <div key={index} className="flex items-center space-x-2">
            {getStatusIcon(result.type)}
            <div className="text-sm text-gray-700">{result.message}</div>
          </div>
        ))}
      </div>
      
      <div className="mb-4">
        <div className={`p-3 rounded-lg border ${
          overallStatus === 'success' 
            ? 'bg-green-50 border-green-200' 
            : overallStatus === 'warning'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallStatus)}
            <span className={`text-sm font-medium ${
              overallStatus === 'success' 
                ? 'text-green-800' 
                : overallStatus === 'warning'
                ? 'text-yellow-800'
                : 'text-red-800'
            }`}>
              {overallStatus === 'success' 
                ? 'Strategy Ready' 
                : overallStatus === 'warning'
                ? 'Strategy Needs Attention'
                : 'Strategy Has Errors'
              }
            </span>
          </div>
          <div className={`text-xs mt-1 ${
            overallStatus === 'success' 
              ? 'text-green-700' 
              : overallStatus === 'warning'
              ? 'text-yellow-700'
              : 'text-red-700'
          }`}>
            {overallStatus === 'success' 
              ? 'Your strategy passes all validation checks and is ready to deploy.' 
              : overallStatus === 'warning'
              ? 'Your strategy works but could be improved with the suggested changes.'
              : 'Please fix the errors before deploying your strategy.'
            }
          </div>
        </div>
      </div>
      
      <button 
        className="btn-primary w-full py-2 rounded-lg text-sm font-medium"
        onClick={onValidate}
      >
        Run Validation
      </button>
    </div>
  );
};

export default StrategyValidation;
