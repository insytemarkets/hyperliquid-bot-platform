import React from 'react';

export interface Bot {
  id: string;
  name: string;
  strategy: string;
  pair: string;
  pnl24h: string;
  totalReturn: string;
  totalReturnPercent: string;
  trades: number;
  winRate: string;
  status: 'Running' | 'Paused' | 'Stopped' | 'Error';
  createdAt: string;
  errorMessage?: string;
}

interface BotCardProps {
  bot: Bot;
  onEdit: (botId: string) => void;
  onPause: (botId: string) => void;
  onResume: (botId: string) => void;
  onStop: (botId: string) => void;
  onRestart: (botId: string) => void;
  onDelete: (botId: string) => void;
  onDebug?: (botId: string) => void;
}

const BotCard: React.FC<BotCardProps> = ({
  bot,
  onEdit,
  onPause,
  onResume,
  onStop,
  onRestart,
  onDelete,
  onDebug
}) => {
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

  const getActivityDotColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-green-500';
      case 'Paused':
        return 'bg-yellow-500';
      case 'Stopped':
        return 'bg-gray-500';
      case 'Error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPnlClass = (pnl: string) => {
    if (pnl.startsWith('+')) return 'profit';
    if (pnl.startsWith('-')) return 'loss';
    return 'neutral';
  };

  const getProgressWidth = (returnPercent: string) => {
    const percent = parseFloat(returnPercent.replace('%', ''));
    return Math.min(Math.abs(percent), 100);
  };

  const getProgressClass = (returnPercent: string) => {
    const percent = parseFloat(returnPercent.replace('%', ''));
    return percent >= 0 ? 'progress-profit' : 'progress-loss';
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'grid trading':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        );
      case 'dca':
      case 'dca strategy':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        );
      case 'momentum':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        );
      case 'arbitrage':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
          </svg>
        );
    }
  };

  const getStrategyGradient = (strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'grid trading':
        return 'from-blue-500 to-blue-600';
      case 'dca':
      case 'dca strategy':
        return 'from-green-500 to-green-600';
      case 'momentum':
        return 'from-purple-500 to-purple-600';
      case 'arbitrage':
        return 'from-red-500 to-red-600';
      default:
        return 'from-teal-500 to-teal-600';
    }
  };

  const renderActionButtons = () => {
    const baseButtons = [
      <button 
        key="edit"
        className="btn-secondary px-3 py-1 rounded text-xs"
        onClick={() => onEdit(bot.id)}
      >
        Edit
      </button>
    ];

    switch (bot.status) {
      case 'Running':
        return [
          ...baseButtons,
          <button 
            key="pause"
            className="btn-warning px-3 py-1 rounded text-xs"
            onClick={() => onPause(bot.id)}
          >
            Pause
          </button>,
          <button 
            key="stop"
            className="btn-danger px-3 py-1 rounded text-xs"
            onClick={() => onStop(bot.id)}
          >
            Stop
          </button>
        ];
      case 'Paused':
        return [
          ...baseButtons,
          <button 
            key="resume"
            className="btn-primary px-3 py-1 rounded text-xs"
            onClick={() => onResume(bot.id)}
          >
            Resume
          </button>,
          <button 
            key="stop"
            className="btn-danger px-3 py-1 rounded text-xs"
            onClick={() => onStop(bot.id)}
          >
            Stop
          </button>
        ];
      case 'Error':
        return [
          ...baseButtons,
          <button 
            key="debug"
            className="btn-secondary px-3 py-1 rounded text-xs"
            onClick={() => onDebug?.(bot.id)}
          >
            Debug
          </button>,
          <button 
            key="restart"
            className="btn-primary px-3 py-1 rounded text-xs"
            onClick={() => onRestart(bot.id)}
          >
            Restart
          </button>,
          <button 
            key="stop"
            className="btn-danger px-3 py-1 rounded text-xs"
            onClick={() => onStop(bot.id)}
          >
            Stop
          </button>
        ];
      case 'Stopped':
        return [
          <button 
            key="clone"
            className="btn-secondary px-3 py-1 rounded text-xs"
            onClick={() => onEdit(bot.id)}
          >
            Clone
          </button>,
          <button 
            key="restart"
            className="btn-primary px-3 py-1 rounded text-xs"
            onClick={() => onRestart(bot.id)}
          >
            Restart
          </button>,
          <button 
            key="delete"
            className="btn-danger px-3 py-1 rounded text-xs"
            onClick={() => onDelete(bot.id)}
          >
            Delete
          </button>
        ];
      default:
        return baseButtons;
    }
  };

  return (
    <div className={`bot-card card rounded-lg p-6 card-hover ${bot.status === 'Error' ? 'border-red-200' : ''} ${bot.status === 'Stopped' ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${getStrategyGradient(bot.strategy)} rounded-lg flex items-center justify-center`}>
            {getStrategyIcon(bot.strategy)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{bot.name}</h3>
            <p className="text-sm text-gray-500">{bot.strategy} • {bot.pair}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {bot.status !== 'Stopped' && (
            <div className={`activity-dot ${getActivityDotColor(bot.status)}`}></div>
          )}
          <span className={`${getStatusClass(bot.status)} px-2 py-1 rounded-full text-xs font-medium`}>
            {bot.status}
          </span>
        </div>
      </div>
      
      {bot.status === 'Error' && bot.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm text-red-700">{bot.errorMessage}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {bot.status === 'Stopped' ? 'Final P&L' : 'P&L (24h)'}
          </span>
          <span className={`font-mono text-sm ${getPnlClass(bot.pnl24h)}`}>{bot.pnl24h}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Return</span>
          <span className={`font-mono text-sm ${getPnlClass(bot.totalReturnPercent)}`}>{bot.totalReturnPercent}</span>
        </div>
        <div className="progress-bar">
          <div 
            className={`progress-fill ${getProgressClass(bot.totalReturnPercent)}`} 
            style={{ width: `${getProgressWidth(bot.totalReturnPercent)}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Win Rate: {bot.winRate}</span>
          <span>{bot.trades} trades</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {bot.createdAt}
        </div>
        <div className="flex space-x-2">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default BotCard;




