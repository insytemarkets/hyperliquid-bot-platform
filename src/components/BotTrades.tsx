import React, { useState, useEffect } from 'react';
import * as BotAPI from '../services/api/botApi';

interface Trade {
  id: string;
  symbol: string;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl: number;
  pnl_pct: number;
  size: number;
  side: string;
  reason: string;
}

interface BotTradesProps {
  botId: string;
  isOpen: boolean;
}

const BotTrades: React.FC<BotTradesProps> = ({ botId, isOpen }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const fetchedTrades = await BotAPI.getBotTrades(botId, 50);
      setTrades(fetchedTrades);
    } catch (error) {
      console.error('❌ BotTrades: Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrades();
      // Refresh every 5 seconds when open
      const interval = setInterval(fetchTrades, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, botId]);

  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDuration = (entryTime: string, exitTime: string | null) => {
    if (!exitTime) return 'Open';
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const diffMs = exit.getTime() - entry.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Recent Trades</h3>
        <button
          onClick={fetchTrades}
          disabled={loading}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && trades.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <span className="text-gray-600">No trades yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{trade.symbol}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    ${trade.entry_price.toFixed(2)}
                    <div className="text-xs text-gray-400">{formatTime(trade.entry_time)}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {trade.exit_price ? (
                      <>
                        ${trade.exit_price.toFixed(2)}
                        <div className="text-xs text-gray-400">{formatTime(trade.exit_time!)}</div>
                      </>
                    ) : (
                      <span className="text-blue-600">Open</span>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-sm font-medium ${
                    trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    {trade.exit_price && (
                      <div className={`text-xs ${trade.pnl_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct.toFixed(2)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {calculateDuration(trade.entry_time, trade.exit_time)}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {trade.exit_time ? formatDateTime(trade.exit_time) : formatDateTime(trade.entry_time)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.reason === 'Take Profit' 
                        ? 'bg-green-100 text-green-800'
                        : trade.reason === 'Stop Loss'
                        ? 'bg-red-100 text-red-800'
                        : trade.reason === 'Open'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trade.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BotTrades;

