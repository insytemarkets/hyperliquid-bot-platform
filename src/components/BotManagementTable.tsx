import React, { useState } from 'react';
import { Bot } from './BotCard';

interface BotManagementTableProps {
  bots: Bot[];
  onEdit: (botId: string) => void;
  onPause: (botId: string) => void;
  onResume: (botId: string) => void;
  onStop: (botId: string) => void;
  onBulkAction: (action: string, botIds: string[]) => void;
}

const BotManagementTable: React.FC<BotManagementTableProps> = ({
  bots,
  onEdit,
  onPause,
  onResume,
  onStop,
  onBulkAction
}) => {
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedBots(bots.map(bot => bot.id));
    } else {
      setSelectedBots([]);
    }
  };

  const handleSelectBot = (botId: string, checked: boolean) => {
    if (checked) {
      setSelectedBots(prev => [...prev, botId]);
    } else {
      setSelectedBots(prev => prev.filter(id => id !== botId));
      setSelectAll(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Running':
        return 'status-active';
      case 'Paused':
        return 'status-paused';
      case 'Stopped':
        return 'status-stopped';
      case 'Error':
        return 'status-error';
      default:
        return 'status-stopped';
    }
  };

  const getPnlClass = (pnl: string) => {
    if (pnl.startsWith('+')) return 'profit';
    if (pnl.startsWith('-')) return 'loss';
    return 'neutral';
  };

  const renderActionButtons = (bot: Bot) => {
    switch (bot.status) {
      case 'Running':
        return (
          <div className="flex justify-center space-x-2">
            <button 
              className="text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => onEdit(bot.id)}
            >
              Edit
            </button>
            <button 
              className="text-yellow-600 hover:text-yellow-800 text-sm"
              onClick={() => onPause(bot.id)}
            >
              Pause
            </button>
            <button 
              className="text-red-600 hover:text-red-800 text-sm"
              onClick={() => onStop(bot.id)}
            >
              Stop
            </button>
          </div>
        );
      case 'Paused':
        return (
          <div className="flex justify-center space-x-2">
            <button 
              className="text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => onEdit(bot.id)}
            >
              Edit
            </button>
            <button 
              className="text-green-600 hover:text-green-800 text-sm"
              onClick={() => onResume(bot.id)}
            >
              Resume
            </button>
            <button 
              className="text-red-600 hover:text-red-800 text-sm"
              onClick={() => onStop(bot.id)}
            >
              Stop
            </button>
          </div>
        );
      default:
        return (
          <div className="flex justify-center space-x-2">
            <button 
              className="text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => onEdit(bot.id)}
            >
              Edit
            </button>
            <button 
              className="text-red-600 hover:text-red-800 text-sm"
              onClick={() => onStop(bot.id)}
            >
              Stop
            </button>
          </div>
        );
    }
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Detailed Bot Management</h3>
        <div className="flex space-x-2">
          <button 
            className="btn-secondary px-3 py-2 rounded text-sm"
            onClick={() => console.log('Export data')}
          >
            Export Data
          </button>
          <button 
            className="btn-secondary px-3 py-2 rounded text-sm"
            onClick={() => onBulkAction('edit', selectedBots)}
            disabled={selectedBots.length === 0}
          >
            Bulk Edit
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bot Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Strategy</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pair</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">P&L (24h)</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total P&L</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trades</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id} className="table-row border-b border-gray-100">
                <td className="py-4 px-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedBots.includes(bot.id)}
                    onChange={(e) => handleSelectBot(bot.id, e.target.checked)}
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{bot.name}</div>
                  <div className="text-xs text-gray-500">{bot.createdAt}</div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{bot.strategy}</td>
                <td className="py-4 px-4 text-sm font-mono text-gray-600">{bot.pair}</td>
                <td className="py-4 px-4 text-right">
                  <div className={`font-mono ${getPnlClass(bot.pnl24h)}`}>{bot.pnl24h}</div>
                  <div className={`text-xs ${getPnlClass(bot.totalReturnPercent)}`}>{bot.totalReturnPercent}</div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className={`font-mono ${getPnlClass(bot.totalReturn)}`}>{bot.totalReturn}</div>
                </td>
                <td className="py-4 px-4 text-right font-mono text-gray-600">{bot.trades}</td>
                <td className="py-4 px-4 text-center">
                  <span className={`${getStatusClass(bot.status)} px-2 py-1 rounded-full text-xs font-medium`}>
                    {bot.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  {renderActionButtons(bot)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BotManagementTable;




