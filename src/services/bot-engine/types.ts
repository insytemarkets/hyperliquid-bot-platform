/**
 * Core types for the bot engine
 */

export type SignalType = 'BUY' | 'SELL' | 'NONE';
export type StrategyType = 'orderbook_imbalance' | 'orderbook_imbalance_v2' | 'cross_pair_lag' | 'momentum_breakout' | 'liquidation_hunter' | 'multi_timeframe_breakout' | 'liquidity_grab' | 'support_liquidity' | 'custom';
export type TradingMode = 'paper' | 'live';
export type BotStatus = 'running' | 'paused' | 'stopped' | 'error';
export type OrderSide = 'buy' | 'sell';

/**
 * Trading Signal
 */
export interface TradingSignal {
  type: SignalType;
  coin: string;
  price: number;
  confidence: number; // 0-1 scale
  reason: string;
  strategyId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Strategy Configuration
 */
export interface StrategyConfig {
  id: string;
  name: string;
  type: StrategyType;
  pairs: string[]; // e.g., ['BTC', 'ETH', 'SOL']
  enabled: boolean;
  mode: TradingMode;
  
  // Risk parameters
  positionSize: number; // USD amount per trade
  maxPositions: number; // Max concurrent positions
  stopLossPercent: number; // e.g., 0.3 = 0.3%
  takeProfitPercent: number; // e.g., 0.5 = 0.5%
  
  // Strategy-specific parameters
  parameters: Record<string, any>;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Position (Paper or Live)
 */
export interface Position {
  id: string;
  botId: string;
  strategyId: string;
  coin: string;
  side: OrderSide;
  entryPrice: number;
  currentPrice: number;
  size: number; // Amount in base currency
  positionValue?: number; // USD value
  pnl?: number; // Unrealized P&L (for compatibility)
  unrealizedPnl?: number; // Unrealized P&L
  realizedPnl?: number; // Realized P&L when closed
  pnlPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  status?: 'open' | 'closed'; // Position status
  mode: TradingMode;
}

/**
 * Trade (Completed)
 */
export interface Trade {
  id: string;
  botId: string;
  strategyId: string;
  coin: string;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  holdTime: number; // milliseconds
  mode: TradingMode;
  reason: string; // Why the trade was closed
  openedAt: number;
  closedAt: number;
}

/**
 * Bot Instance
 */
export interface BotInstance {
  id: string;
  name: string;
  strategyId: string;
  status: BotStatus;
  mode: TradingMode;
  
  // Current state
  positions: Position[];
  
  // Performance
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    todayPnl: number;
    avgHoldTime: number; // milliseconds
    avgPnlPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  
  // Timing
  startedAt: number;
  lastTradeAt: number;
  
  // Error tracking
  lastError?: string;
  errorCount: number;
}

/**
 * Market Condition
 */
export interface MarketCondition {
  coin: string;
  price: number;
  priceChange1m: number; // % change in 1 minute
  priceChange5m: number; // % change in 5 minutes
  orderBookImbalance: number; // bid depth / ask depth
  tradePressure: number; // -1 to 1 (sell to buy)
  volatility: number; // Price standard deviation
  timestamp: number;
}

/**
 * Strategy Performance Metrics
 */
export interface StrategyPerformance {
  strategyId: string;
  totalTrades: number;
  winRate: number;
  avgPnlPercent: number;
  totalPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number; // Total wins / Total losses
  avgHoldTime: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

/**
 * Backtest Configuration
 */
export interface BacktestConfig {
  strategyConfig: StrategyConfig;
  startDate: number;
  endDate: number;
  initialCapital: number;
  commission: number; // % per trade
}

/**
 * Backtest Result
 */
export interface BacktestResult {
  config: BacktestConfig;
  performance: StrategyPerformance;
  trades: Trade[];
  equityCurve: Array<{ timestamp: number; equity: number }>;
  drawdownCurve: Array<{ timestamp: number; drawdown: number }>;
  completedAt: number;
  duration: number; // milliseconds
}

