import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BotCard, { Bot } from '../components/BotCard';
import BotManagementTable from '../components/BotManagementTable';

const MyBots: React.FC = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock bot data - this would come from the Hyperliquid SDK
  const bots: Bot[] = [
    {
      id: '1',
      name: 'ETH Grid Master',
      strategy: 'Grid Trading',
      pair: 'ETH-USD',
      pnl24h: '+$2,345.67',
      totalReturn: '+$12,345.67',
      totalReturnPercent: '+12.3%',
      trades: 147,
      winRate: '78.2%',
      status: 'Running',
      createdAt: 'Created 2 days ago'
    },
    {
      id: '2',
      name: 'BTC DCA Pro',
      strategy: 'DCA Strategy',
      pair: 'BTC-USD',
      pnl24h: '+$8,901.23',
      totalReturn: '+$18,901.23',
      totalReturnPercent: '+18.9%',
      trades: 89,
      winRate: '82.0%',
      status: 'Running',
      createdAt: 'Created 1 week ago'
    },
    {
      id: '3',
      name: 'SOL Scalper',
      strategy: 'Momentum',
      pair: 'SOL-USD',
      pnl24h: '-$234.56',
      totalReturn: '-$234.56',
      totalReturnPercent: '-2.3%',
      trades: 234,
      winRate: '65.4%',
      status: 'Paused',
      createdAt: 'Paused 2 hours ago'
    },
    {
      id: '4',
      name: 'AVAX Arbitrage',
      strategy: 'Arbitrage',
      pair: 'AVAX-USD',
      pnl24h: '$0.00',
      totalReturn: '+$5,700.00',
      totalReturnPercent: '+5.7%',
      trades: 45,
      winRate: '91.2%',
      status: 'Error',
      createdAt: 'Error 30 minutes ago',
      errorMessage: 'API connection failed'
    },
    {
      id: '5',
      name: 'Multi-Pair Grid',
      strategy: 'Grid Trading',
      pair: 'Multiple',
      pnl24h: '+$1,567.89',
      totalReturn: '+$9,400.00',
      totalReturnPercent: '+9.4%',
      trades: 312,
      winRate: '71.8%',
      status: 'Running',
      createdAt: 'Created 5 days ago'
    },
    {
      id: '6',
      name: 'MATIC Swing',
      strategy: 'Swing Trading',
      pair: 'MATIC-USD',
      pnl24h: '-$456.78',
      totalReturn: '-$456.78',
      totalReturnPercent: '-4.6%',
      trades: 67,
      winRate: '58.3%',
      status: 'Stopped',
      createdAt: 'Stopped yesterday'
    }
  ];

  const tabs = [
    { name: 'All', count: 13 },
    { name: 'Running', count: 8 },
    { name: 'Paused', count: 3 },
    { name: 'Stopped', count: 1 },
    { name: 'Error', count: 1 }
  ];

  const filteredBots = bots.filter(bot => {
    if (activeTab === 'All') return true;
    return bot.status === activeTab;
  });

  // Bot action handlers - these would integrate with Hyperliquid SDK
  const handleEdit = (botId: string) => {
    console.log('Edit bot:', botId);
    // TODO: Navigate to bot editor or open edit modal
  };

  const handlePause = (botId: string) => {
    console.log('Pause bot:', botId);
    // TODO: Call Hyperliquid SDK to pause bot
  };

  const handleResume = (botId: string) => {
    console.log('Resume bot:', botId);
    // TODO: Call Hyperliquid SDK to resume bot
  };

  const handleStop = (botId: string) => {
    console.log('Stop bot:', botId);
    // TODO: Call Hyperliquid SDK to stop bot
  };

  const handleRestart = (botId: string) => {
    console.log('Restart bot:', botId);
    // TODO: Call Hyperliquid SDK to restart bot
  };

  const handleDelete = (botId: string) => {
    console.log('Delete bot:', botId);
    // TODO: Call Hyperliquid SDK to delete bot
  };

  const handleDebug = (botId: string) => {
    console.log('Debug bot:', botId);
    // TODO: Open debug interface or logs
  };

  const handleBulkAction = (action: string, botIds: string[]) => {
    console.log('Bulk action:', action, 'for bots:', botIds);
    // TODO: Implement bulk actions
  };

  const handleCreateBot = () => {
    console.log('Create new bot');
    // TODO: Navigate to bot creation page
  };

  const handleBulkActions = () => {
    console.log('Open bulk actions menu');
    // TODO: Open bulk actions menu
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="My Bots" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="My Bots" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Performance Summary */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="metric-card card rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Bots</div>
                <div className="text-2xl font-bold text-gray-900">13</div>
                <div className="text-xs text-gray-500 mt-1">8 active, 5 inactive</div>
              </div>
              <div className="metric-card card rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total P&L</div>
                <div className="text-2xl font-bold profit">+$45,678.90</div>
                <div className="text-xs text-green-600 mt-1">+18.7% (30d)</div>
              </div>
              <div className="metric-card card rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Best Performer</div>
                <div className="text-2xl font-bold profit">+$12,345</div>
                <div className="text-xs text-gray-500 mt-1">BTC DCA Pro</div>
              </div>
              <div className="metric-card card rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-gray-900">2,847</div>
                <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
              </div>
              <div className="metric-card card rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Win Rate</div>
                <div className="text-2xl font-bold text-gray-900">73.2%</div>
                <div className="text-xs text-green-600 mt-1">+2.1% vs last month</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Filter Tabs and Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    className={`px-4 py-2 rounded text-sm ${
                      activeTab === tab.name ? 'tab-active' : 'tab-inactive'
                    }`}
                    onClick={() => setActiveTab(tab.name)}
                  >
                    {tab.name} ({tab.count})
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>Sort by Performance</option>
                  <option>Sort by Date Created</option>
                  <option>Sort by Name</option>
                  <option>Sort by Status</option>
                </select>
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-2 rounded text-sm ${
                      viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => setViewMode('grid')}
                  >
                    Grid View
                  </button>
                  <button 
                    className={`px-3 py-2 rounded text-sm ${
                      viewMode === 'list' ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => setViewMode('list')}
                  >
                    List View
                  </button>
                </div>
              </div>
            </div>

            {/* Bot Cards Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {filteredBots.map((bot) => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    onEdit={handleEdit}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                    onRestart={handleRestart}
                    onDelete={handleDelete}
                    onDebug={handleDebug}
                  />
                ))}
              </div>
            )}

            {/* Bot Management Table View */}
            {viewMode === 'list' && (
              <BotManagementTable
                bots={filteredBots}
                onEdit={handleEdit}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onBulkAction={handleBulkAction}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyBots;
