import React, { useState, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ComponentSidebar from '../components/ComponentSidebar';
import StrategyCanvas from '../components/StrategyCanvas';
import NodePropertiesPanel from '../components/NodePropertiesPanel';
import StrategyValidation from '../components/StrategyValidation';
import BacktestPreview from '../components/BacktestPreview';
import { StrategyNodeData } from '../components/StrategyNode';

interface Connection {
  id: string;
  from: { nodeId: string; output: number };
  to: { nodeId: string; input: number };
}

interface BotConfig {
  name: string;
  tradingPair: string;
  initialCapital: string;
  riskLevel: string;
}

const BotBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Visual Builder');
  const [botConfig, setBotConfig] = useState<BotConfig>({
    name: 'Advanced Grid Strategy',
    tradingPair: 'ETH-USD',
    initialCapital: '$5,000',
    riskLevel: 'Moderate'
  });

  // Handle pre-selected strategy from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const strategyId = urlParams.get('strategy');
    
    if (strategyId === 'multi_timeframe_breakout') {
      setBotConfig(prev => ({
        ...prev,
        name: 'Multi-Timeframe Breakout Bot',
        riskLevel: 'Medium'
      }));
      
      // Set up nodes for the multi-timeframe breakout strategy
      setNodes([
        {
          id: '1',
          type: 'trigger',
          title: 'Multi-Timeframe Monitor',
          description: 'Monitor 5m/15m/30m price highs',
          position: { x: 50, y: 50 },
          parameters: {
            asset: 'ETH-USD',
            timeframes: ['5m', '15m', '30m'],
            breakoutThreshold: '0.2%'
          },
          connectors: { inputs: 0, outputs: 1 }
        },
        {
          id: '2',
          type: 'indicator',
          title: 'Momentum Score',
          description: 'Calculate momentum with volume weighting',
          position: { x: 300, y: 50 },
          parameters: {
            minMomentumScore: '0.5',
            volumeThreshold: '1.5x',
            lookbackPeriod: '10 bars'
          },
          connectors: { inputs: 1, outputs: 1 }
        },
        {
          id: '3',
          type: 'action',
          title: 'Tier-Based Entry',
          description: 'Execute buy orders based on breakout tier',
          position: { x: 550, y: 50 },
          parameters: {
            tier1Confidence: '90%',
            tier2Confidence: '75%',
            tier3Confidence: '60%',
            positionSize: '2%'
          },
          connectors: { inputs: 1, outputs: 0 }
        }
      ]);
    }
  }, []);

  const [nodes, setNodes] = useState<StrategyNodeData[]>([
    {
      id: '1',
      type: 'trigger',
      title: 'Price Trigger',
      description: 'Monitor ETH price movement',
      position: { x: 50, y: 50 },
      parameters: {
        asset: 'ETH-USD',
        conditionType: 'Price Above',
        priceAbove: '$3400',
        timeframe: '5m'
      },
      connectors: { inputs: 0, outputs: 1 }
    },
    {
      id: '2',
      type: 'indicator',
      title: 'RSI Indicator',
      description: 'Check momentum conditions',
      position: { x: 350, y: 50 },
      parameters: {
        indicatorType: 'RSI',
        period: '14',
        condition: '> 70'
      },
      connectors: { inputs: 0, outputs: 1 }
    },
    {
      id: '3',
      type: 'condition',
      title: 'Logic Gate (AND)',
      description: 'Combine conditions',
      position: { x: 200, y: 250 },
      parameters: {
        logicType: 'AND',
        description: 'Both conditions must be true'
      },
      connectors: { inputs: 2, outputs: 1 }
    },
    {
      id: '4',
      type: 'action',
      title: 'Buy Order',
      description: 'Execute trade action',
      position: { x: 500, y: 250 },
      parameters: {
        actionType: 'Buy',
        amount: '$500',
        orderType: 'Market'
      },
      connectors: { inputs: 1, outputs: 0 }
    }
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'conn1',
      from: { nodeId: '1', output: 0 },
      to: { nodeId: '3', input: 0 }
    },
    {
      id: 'conn2',
      from: { nodeId: '2', output: 0 },
      to: { nodeId: '3', input: 1 }
    },
    {
      id: 'conn3',
      from: { nodeId: '3', output: 0 },
      to: { nodeId: '4', input: 0 }
    }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;

  const handleNodeAdd = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node-${Date.now()}`;
    
    const nodeTypeMap = {
      trigger: {
        title: 'Price Trigger',
        description: 'Monitor price conditions',
        connectors: { inputs: 0, outputs: 1 },
        parameters: { asset: 'ETH-USD', conditionType: 'Price Above', priceAbove: '$3400', timeframe: '5m' }
      },
      indicator: {
        title: 'Technical Indicator',
        description: 'Technical analysis',
        connectors: { inputs: 0, outputs: 1 },
        parameters: { indicatorType: 'RSI', period: '14', condition: '> 70' }
      },
      condition: {
        title: 'Logic Condition',
        description: 'Combine conditions',
        connectors: { inputs: 2, outputs: 1 },
        parameters: { logicType: 'AND', description: 'Combine multiple conditions' }
      },
      action: {
        title: 'Trade Action',
        description: 'Execute trades',
        connectors: { inputs: 1, outputs: 0 },
        parameters: { actionType: 'Buy', amount: '$500', orderType: 'Market' }
      }
    };

    const nodeConfig = nodeTypeMap[nodeType as keyof typeof nodeTypeMap];
    if (!nodeConfig) return;

    const newNode: StrategyNodeData = {
      id: nodeId,
      type: nodeType as any,
      title: nodeConfig.title,
      description: nodeConfig.description,
      position,
      parameters: nodeConfig.parameters,
      connectors: nodeConfig.connectors
    };

    setNodes(prev => [...prev, newNode]);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<StrategyNodeData>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  }, []);

  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  const handleConnectionAdd = useCallback((connection: Omit<Connection, 'id'>) => {
    const newConnection: Connection = {
      ...connection,
      id: `conn-${Date.now()}`
    };
    setConnections(prev => [...prev, newConnection]);
  }, []);

  const handleClearAll = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
  }, []);

  const handleValidate = useCallback(() => {
    console.log('Validating strategy...');
    // TODO: Implement validation logic
  }, []);

  const handleSaveDraft = () => {
    console.log('Saving draft...', { botConfig, nodes, connections });
    // TODO: Save to backend
  };

  const handleBacktest = () => {
    console.log('Running backtest...', { botConfig, nodes, connections });
    // TODO: Navigate to backtest page
  };

  const handleDeploy = () => {
    console.log('Deploying bot...', { botConfig, nodes, connections });
    // TODO: Deploy bot with Hyperliquid SDK
  };

  const handleFullBacktest = () => {
    console.log('Opening full backtest...');
    // TODO: Navigate to full backtest page
  };

  const tabs = ['Visual Builder', 'Code Editor', 'Templates'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Bot Builder" />
      
      <div className="flex h-screen">
        <div className="w-64 sidebar overflow-y-auto">
          <Sidebar activeItem="Bot Builder" />
          <ComponentSidebar />
        </div>
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Bot Configuration Header */}
            <div className="card rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Advanced Bot Builder</h2>
                  <p className="text-sm text-gray-500">Create custom trading strategies with visual components</p>
                </div>
                <div className="flex space-x-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      className={`px-4 py-2 rounded text-sm ${
                        activeTab === tab ? 'tab-active' : 'tab-inactive'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name</label>
                  <input 
                    type="text" 
                    className="form-input w-full px-3 py-2 rounded-lg" 
                    value={botConfig.name}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trading Pair</label>
                  <select 
                    className="form-input w-full px-3 py-2 rounded-lg"
                    value={botConfig.tradingPair}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, tradingPair: e.target.value }))}
                  >
                    <option value="ETH-USD">ETH-USD</option>
                    <option value="BTC-USD">BTC-USD</option>
                    <option value="SOL-USD">SOL-USD</option>
                    <option value="AVAX-USD">AVAX-USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital</label>
                  <input 
                    type="text" 
                    className="form-input w-full px-3 py-2 rounded-lg" 
                    value={botConfig.initialCapital}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, initialCapital: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                  <select 
                    className="form-input w-full px-3 py-2 rounded-lg"
                    value={botConfig.riskLevel}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, riskLevel: e.target.value }))}
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Strategy Canvas */}
              <div className="lg:col-span-3">
                {activeTab === 'Visual Builder' && (
                  <StrategyCanvas
                    nodes={nodes}
                    connections={connections}
                    selectedNodeId={selectedNodeId}
                    onNodeSelect={setSelectedNodeId}
                    onNodeAdd={handleNodeAdd}
                    onNodeUpdate={handleNodeUpdate}
                    onNodeMove={handleNodeMove}
                    onConnectionAdd={handleConnectionAdd}
                    onClearAll={handleClearAll}
                    onValidate={handleValidate}
                  />
                )}
                
                {activeTab === 'Code Editor' && (
                  <div className="card rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Editor</h3>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                      <div className="text-gray-500">// Strategy Code (Coming Soon)</div>
                      <div>function executeStrategy() {`{`}</div>
                      <div className="ml-4">// Generated from visual builder</div>
                      <div className="ml-4">// Custom code editing capabilities</div>
                      <div>{`}`}</div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'Templates' && (
                  <div className="card rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Templates</h3>
                    <p className="text-gray-500">Load pre-built strategy templates to get started quickly.</p>
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Node Properties */}
                <NodePropertiesPanel
                  selectedNode={selectedNode}
                  onNodeUpdate={handleNodeUpdate}
                />

                {/* Strategy Validation */}
                <StrategyValidation
                  nodes={nodes}
                  connections={connections}
                  onValidate={handleValidate}
                />

                {/* Backtest Preview */}
                <BacktestPreview onFullBacktest={handleFullBacktest} />
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Action Buttons */}
      <div className="fixed bottom-6 right-6 flex space-x-3">
        <button 
          className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          onClick={handleSaveDraft}
        >
          Save Draft
        </button>
        <button 
          className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          onClick={handleBacktest}
        >
          Backtest
        </button>
        <button 
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          onClick={handleDeploy}
        >
          Deploy Bot
        </button>
      </div>
    </div>
  );
};

export default BotBuilder;

