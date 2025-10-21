import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StrategyBuilder from '../components/bot/StrategyBuilder';
import { useBot } from '../contexts/BotContext';
import { StrategyConfig } from '../services/bot-engine/types';
import { StrategyFactory } from '../services/bot-engine';

const StrategiesNew: React.FC = () => {
  const { strategies, addStrategy, updateStrategy, deleteStrategy, deployBot, loading } = useBot();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<StrategyConfig | undefined>();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all');

  const handleSaveStrategy = (config: StrategyConfig) => {
    if (editingStrategy) {
      updateStrategy(config.id, config);
    } else {
      addStrategy(config);
    }
    setShowBuilder(false);
    setEditingStrategy(undefined);
  };

  const handleDeployBot = async (strategyId: string) => {
    if (window.confirm('Deploy this strategy as a bot?')) {
      await deployBot(strategyId);
    }
  };

  const handleEditStrategy = (strategy: StrategyConfig) => {
    setEditingStrategy(strategy);
    setShowBuilder(true);
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategy(strategyId);
    }
  };

  const filteredStrategies = strategies.filter(s => {
    if (activeTab === 'active') return s.enabled;
    if (activeTab === 'draft') return !s.enabled;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Strategies" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Strategies" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trading Strategies</h1>
                <p className="text-gray-600 mt-1">Configure and deploy automated trading strategies</p>
              </div>
              
              <button
                onClick={() => {
                  setEditingStrategy(undefined);
                  setShowBuilder(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Create Strategy</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'all', label: 'All Strategies', count: strategies.length },
                  { id: 'active', label: 'Active', count: strategies.filter(s => s.enabled).length },
                  { id: 'draft', label: 'Drafts', count: strategies.filter(s => !s.enabled).length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Empty State */}
            {filteredStrategies.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies yet</h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'all' 
                    ? 'Create your first trading strategy to get started'
                    : activeTab === 'active'
                    ? 'No active strategies. Enable a draft or create a new one.'
                    : 'No draft strategies. All strategies are active.'}
                </p>
                {activeTab === 'all' && (
                  <button
                    onClick={() => {
                      setEditingStrategy(undefined);
                      setShowBuilder(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <span>Create Strategy</span>
                  </button>
                )}
              </div>
            )}

            {/* Strategy List */}
            {filteredStrategies.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredStrategies.map((strategy) => {
                  const metadata = StrategyFactory.getStrategyMetadata(strategy.type);
                  
                  return (
                    <div key={strategy.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{strategy.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              strategy.mode === 'paper'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {strategy.mode.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              strategy.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {strategy.enabled ? 'ACTIVE' : 'DRAFT'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{metadata.description}</p>
                        </div>
                      </div>

                      {/* Strategy Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div className="text-sm font-medium text-gray-900">{metadata.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Risk Level</div>
                          <div className="text-sm font-medium">
                            <span className={`${
                              metadata.riskLevel === 'low'
                                ? 'text-green-600'
                                : metadata.riskLevel === 'medium'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {metadata.riskLevel.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Pairs</div>
                          <div className="text-sm font-medium text-gray-900">
                            {strategy.pairs.slice(0, 3).join(', ')}
                            {strategy.pairs.length > 3 && ` +${strategy.pairs.length - 3}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Position Size</div>
                          <div className="text-sm font-medium text-gray-900">${strategy.positionSize}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleDeployBot(strategy.id)}
                          disabled={loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Deploy Bot
                        </button>
                        <button
                          onClick={() => handleEditStrategy(strategy)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStrategy(strategy.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Strategy Builder Modal */}
      {showBuilder && (
        <StrategyBuilder
          initialConfig={editingStrategy}
          onSave={handleSaveStrategy}
          onCancel={() => {
            setShowBuilder(false);
            setEditingStrategy(undefined);
          }}
        />
      )}
    </div>
  );
};

export default StrategiesNew;

