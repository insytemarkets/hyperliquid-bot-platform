import React, { useState } from 'react';

interface Bot {
  id: string;
  name: string;
  strategy: string;
  pair: string;
  pnl: string;
  pnlPercent: string;
  trades: number;
  winRate: string;
  status: 'Running' | 'Paused' | 'Stopped';
  createdAt: string;
}

const ActiveBotsTable: React.FC = () => {
  const [activeTab, setActiveTab] = useState('All');
  
  const bots: Bot[] = [
    {
      id: '1',
      name: 'ETH Grid Master',
      strategy: 'Grid Trading',
      pair: 'ETH-USD',
      pnl: '+$2,345.67',
      pnlPercent: '+12.3%',
      trades: 147,
      winRate: '78.2%',
      status: 'Running',
      createdAt: '2 days ago'
    },
    {
      id: '2',
      name: 'BTC DCA Pro',
      strategy: 'DCA',
      pair: 'BTC-USD',
      pnl: '+$8,901.23',
      pnlPercent: '+18.9%',
      trades: 89,
      winRate: '82.0%',
      status: 'Running',
      createdAt: '1 week ago'
    },
    {
      id: '3',
      name: 'SOL Scalper',
      strategy: 'Momentum',
      pair: 'SOL-USD',
      pnl: '-$234.56',
      pnlPercent: '-2.3%',
      trades: 234,
      winRate: '65.4%',
      status: 'Paused',
      createdAt: '3 days ago'
    }
  ];

  const tabs = [
    { name: 'All', count: 12 },
    { name: 'Running', count: 8 },
    { name: 'Paused', count: 4 }
  ];

  const handleAction = (botId: string, action: string) => {
    console.log(`${action} bot ${botId}`);
    // TODO: Implement bot actions with Hyperliquid SDK
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Running':
        return 'status-active';
      case 'Paused':
        return 'status-paused';
      case 'Stopped':
        return 'status-stopped';
      default:
        return 'status-stopped';
    }
  };

  const getPnlClass = (pnl: string) => {
    return pnl.startsWith('+') ? 'profit' : 'loss';
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Active Bots</h3>
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === tab.name ? 'tab-active' : 'tab-inactive'
              }`}
              onClick={() => setActiveTab(tab.name)}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bot Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Strategy</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pair</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">P&L</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trades</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Win Rate</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id} className="table-row border-b border-gray-100">
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{bot.name}</div>
                  <div className="text-xs text-gray-500">Created {bot.createdAt}</div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{bot.strategy}</td>
                <td className="py-4 px-4 text-sm font-mono text-gray-600">{bot.pair}</td>
                <td className="py-4 px-4 text-right">
                  <div className={`font-mono ${getPnlClass(bot.pnl)}`}>{bot.pnl}</div>
                  <div className={`text-xs ${getPnlClass(bot.pnl)}`}>{bot.pnlPercent}</div>
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-600">{bot.trades}</td>
                <td className="py-4 px-4 text-right font-mono text-gray-600">{bot.winRate}</td>
                <td className="py-4 px-4 text-center">
                  <span className={`${getStatusClass(bot.status)} px-2 py-1 rounded-full text-xs font-medium`}>
                    {bot.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex justify-center space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => handleAction(bot.id, 'edit')}
                    >
                      Edit
                    </button>
                    {bot.status === 'Running' ? (
                      <button 
                        className="text-yellow-600 hover:text-yellow-800 text-sm"
                        onClick={() => handleAction(bot.id, 'pause')}
                      >
                        Pause
                      </button>
                    ) : (
                      <button 
                        className="text-green-600 hover:text-green-800 text-sm"
                        onClick={() => handleAction(bot.id, 'resume')}
                      >
                        Resume
                      </button>
                    )}
                    <button 
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => handleAction(bot.id, 'stop')}
                    >
                      Stop
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveBotsTable;


