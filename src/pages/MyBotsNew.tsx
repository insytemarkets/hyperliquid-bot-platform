import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useBot } from '../contexts/BotContextNew';
import * as BotAPI from '../services/api/botApi';
import BotLogs from '../components/BotLogs';

const MyBotsNew: React.FC = () => {
  const { bots, strategies, pauseBot, resumeBot, stopBot, refreshBots } = useBot();
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'paused' | 'paper' | 'live'>('all');
  const [testLoading, setTestLoading] = useState(false);
  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);

  const filteredBots = bots.filter(bot => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'running') return bot.status === 'running';
    if (filterStatus === 'paused') return bot.status === 'paused';
    if (filterStatus === 'paper') return bot.mode === 'paper';
    if (filterStatus === 'live') return bot.mode === 'live';
    return true;
  });

  const runningBots = bots.filter(b => b.status === 'running');
  const totalPnl = bots.reduce((sum, b) => sum + b.performance.totalPnl, 0);
  const todayPnl = bots.reduce((sum, b) => sum + b.performance.todayPnl, 0);
  const totalTrades = bots.reduce((sum, b) => sum + b.performance.totalTrades, 0);
  const avgWinRate = bots.length > 0
    ? bots.reduce((sum, b) => sum + b.performance.winRate, 0) / bots.length
    : 0;

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const handleTestBotRunner = async () => {
    setTestLoading(true);
    try {
      console.log('🧪 Testing bot-runner manually...');
      await BotAPI.triggerBotRunner();
      console.log('✅ Bot-runner test completed');
      
      // Refresh bots to see any changes
      setTimeout(() => refreshBots(), 2000);
    } catch (error) {
      console.error('❌ Bot-runner test failed:', error);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="My Bots" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="My Bots" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Bots</h1>
                <p className="text-gray-600 mt-1">Monitor and manage your deployed trading bots</p>
              </div>
              
              {/* Test Bot Runner Button */}
              <button
                onClick={handleTestBotRunner}
                disabled={testLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {testLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    🧪 Test Bot Runner
                  </>
                )}
              </button>
            </div>

            {/* Overview Stats */}
            {bots.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Active Bots</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{runningBots.length}</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Today's P&L</div>
                      <div className={`text-2xl font-bold mt-1 ${todayPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      todayPnl >= 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <svg className={`w-6 h-6 ${todayPnl >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Total P&L</div>
                      <div className={`text-2xl font-bold mt-1 ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Win Rate</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{avgWinRate.toFixed(1)}%</div>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'all', label: 'All Bots', count: bots.length },
                  { id: 'running', label: 'Running', count: bots.filter(b => b.status === 'running').length },
                  { id: 'paused', label: 'Paused', count: bots.filter(b => b.status === 'paused').length },
                  { id: 'paper', label: 'Paper', count: bots.filter(b => b.mode === 'paper').length },
                  { id: 'live', label: 'Live', count: bots.filter(b => b.mode === 'live').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      filterStatus === tab.id
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
            {filteredBots.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bots deployed</h3>
                <p className="text-gray-600">
                  {bots.length === 0 
                    ? 'Deploy a strategy from the Strategies page to start trading'
                    : 'No bots match the selected filter'}
                </p>
              </div>
            )}

            {/* Bot List */}
            {filteredBots.length > 0 && (
              <div className="space-y-4">
                {filteredBots.map((bot) => {
                  const strategy = strategies.find(s => s.id === bot.strategy_id);
                  
                  return (
                    <div key={bot.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      {/* Bot Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
                              bot.status === 'running'
                                ? 'bg-green-100 text-green-800'
                                : bot.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bot.status === 'running' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              )}
                              <span>{bot.status.toUpperCase()}</span>
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              bot.mode === 'paper'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {bot.mode.toUpperCase()}
                            </span>
                          </div>
                          {strategy && (
                            <p className="text-sm text-gray-600 mt-1">Strategy: {strategy.type}</p>
                          )}
                        </div>
                      </div>

                      {/* Bot Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500">Today P&L</div>
                          <div className={`text-sm font-medium ${bot.performance.todayPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {bot.performance.todayPnl >= 0 ? '+' : ''}${bot.performance.todayPnl.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Trades</div>
                          <div className="text-sm font-medium text-gray-900">{bot.performance.totalTrades}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Win Rate</div>
                          <div className="text-sm font-medium text-gray-900">{bot.performance.winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Open Positions</div>
                          <div className="text-sm font-medium text-gray-900">{bot.positions.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Running Time</div>
                          <div className="text-sm font-medium text-gray-900">{formatTime(new Date(bot.deployed_at).getTime())}</div>
                        </div>
                      </div>

                      {/* Last Activity */}
                      {bot.last_tick_at && (
                        <div className="text-xs text-gray-500 mb-4">
                          Last activity: {formatTime(new Date(bot.last_tick_at).getTime())}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                        {bot.status === 'running' && (
                          <button
                            onClick={() => pauseBot(bot.id)}
                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        {bot.status === 'paused' && (
                          <button
                            onClick={() => resumeBot(bot.id)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to stop this bot?')) {
                              stopBot(bot.id);
                            }
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Stop
                        </button>
                        <button 
                          onClick={() => setExpandedBotId(expandedBotId === bot.id ? null : bot.id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          📋 {expandedBotId === bot.id ? 'Hide' : 'View'} Logs
                        </button>
                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          View Details
                        </button>
                      </div>

                      {/* Bot Logs */}
                      <BotLogs botId={bot.id} isOpen={expandedBotId === bot.id} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyBotsNew;


