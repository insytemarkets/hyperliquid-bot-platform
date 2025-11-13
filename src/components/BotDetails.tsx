import React from 'react';

interface Strategy {
  id: string;
  name: string;
  type: string;
  pairs: string[];
  positionSize?: number;
  position_size?: number;
  maxPositions?: number;
  max_positions?: number;
  stopLossPercent?: number;
  stop_loss_percent?: number;
  takeProfitPercent?: number;
  take_profit_percent?: number;
  parameters: Record<string, any>;
}

interface BotDetailsProps {
  bot: {
    id: string;
    name: string;
    status: string;
    mode: string;
    deployed_at: string;
    last_tick_at?: string;
    error_count: number;
    positions: any[];
    performance: {
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
      winRate: number;
      totalPnl: number;
      todayPnl: number;
      unrealizedPnl: number;
      realizedPnl: number;
    };
  };
  strategy: Strategy | undefined;
  isOpen: boolean;
}

const BotDetails: React.FC<BotDetailsProps> = ({ bot, strategy, isOpen }) => {
  if (!isOpen) return null;

  const getStrategyDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'multi_timeframe_breakout': 'Monitors 5m/15m/30m timeframes for price highs/lows. Enters LONG when price is within 0.5% of HTF levels with volume confirmation. Quick scalping strategy.',
      'orderbook_imbalance': 'Analyzes bid/ask depth in real-time. Enters when imbalance ratio > 3.0x (buy pressure) or < 0.33x (sell pressure). Fast scalping strategy.',
      'orderbook_imbalance_v2': 'Percentage-based order book imbalance strategy. Enters LONG when bid volume exceeds threshold (default 70%). Includes minimum hold time and cooldown period to avoid overtrading.',
      'momentum_breakout': 'Tracks 5-minute price momentum. Enters on >2% or <-2% momentum. Rides strong moves.',
      'liquidity_grab': 'Detects when price wicks below 1h/30m support levels (liquidity grab) then bounces back above support within 5 minutes. Requires 1.5x volume confirmation. Catches false breakdowns and institutional liquidity grabs.',
    };
    return descriptions[type] || 'Custom trading strategy';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Bot Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strategy Configuration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Strategy Configuration</h4>
          {strategy ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Strategy Type:</span>
                <span className="font-medium text-gray-900 capitalize">{strategy.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trading Pairs:</span>
                <span className="font-medium text-gray-900">{strategy.pairs.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Position Size:</span>
                <span className="font-medium text-gray-900">${(strategy.positionSize || strategy.position_size || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Positions:</span>
                <span className="font-medium text-gray-900">{strategy.maxPositions || strategy.max_positions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Take Profit:</span>
                <span className="font-medium text-green-600">{(strategy.takeProfitPercent || strategy.take_profit_percent || 0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stop Loss:</span>
                <span className="font-medium text-red-600">{(strategy.stopLossPercent || strategy.stop_loss_percent || 0)}%</span>
              </div>
              {strategy.parameters && Object.keys(strategy.parameters).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Additional Parameters:</div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {Object.entries(strategy.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key.replace(/_/g, ' ')}:</span>
                        <span className="font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Strategy not found</div>
          )}
        </div>

        {/* Strategy Description */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">How It Works</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {strategy ? getStrategyDescription(strategy.type) : 'No strategy description available'}
          </p>
        </div>

        {/* Performance Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Performance Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-medium text-gray-900">{bot.performance.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Winning Trades:</span>
              <span className="font-medium text-green-600">{bot.performance.winningTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Losing Trades:</span>
              <span className="font-medium text-red-600">{bot.performance.losingTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate:</span>
              <span className={`font-medium ${bot.performance.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {bot.performance.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">Realized P&L:</span>
                <span className={`font-medium ${bot.performance.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {bot.performance.realizedPnl >= 0 ? '+' : ''}${bot.performance.realizedPnl.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Unrealized P&L:</span>
                <span className={`font-medium ${bot.performance.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {bot.performance.unrealizedPnl >= 0 ? '+' : ''}${bot.performance.unrealizedPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Bot Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                bot.status === 'running' ? 'text-green-600' : 
                bot.status === 'paused' ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {bot.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mode:</span>
              <span className={`font-medium ${bot.mode === 'paper' ? 'text-blue-600' : 'text-red-600'}`}>
                {bot.mode.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deployed:</span>
              <span className="font-medium text-gray-900">{formatTime(bot.deployed_at)}</span>
            </div>
            {bot.last_tick_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Activity:</span>
                <span className="font-medium text-gray-900">{formatTimeAgo(bot.last_tick_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Open Positions:</span>
              <span className="font-medium text-gray-900">{bot.positions.length}</span>
            </div>
            {bot.error_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Errors:</span>
                <span className="font-medium text-red-600">{bot.error_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Positions Summary */}
      {bot.positions.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Open Positions</h4>
          <div className="space-y-2">
            {bot.positions.map((position) => {
              const pnl = position.unrealized_pnl || 0;
              const pnlPct = position.entry_price 
                ? ((position.current_price - position.entry_price) / position.entry_price) * 100 
                : 0;
              
              return (
                <div key={position.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{position.symbol}</span>
                    <span className="text-gray-500">
                      Entry: ${position.entry_price?.toFixed(2) || 'N/A'}
                    </span>
                    <span className="text-gray-500">
                      Current: ${position.current_price?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  <div className={`font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BotDetails;

