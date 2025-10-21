import { Position, Trade, OrderSide } from './types';
import { MarketDataService } from './MarketDataService';

/**
 * Paper Trading Engine
 * 
 * Simulates trades without real money
 * Uses real market prices for accurate simulation
 */

export class PaperTradingEngine {
  private positions: Map<string, Position> = new Map(); // positionId -> Position
  private trades: Trade[] = [];
  private marketData: MarketDataService;
  
  constructor(marketData: MarketDataService) {
    this.marketData = marketData;
  }

  /**
   * Open a new position (simulated)
   */
  public async openPosition(
    botId: string,
    strategyId: string,
    coin: string,
    side: OrderSide,
    size: number,
    stopLossPercent: number,
    takeProfitPercent: number
  ): Promise<Position> {
    // Get current market price
    const currentPrice = this.marketData.getCurrentPrice(coin);
    if (!currentPrice) {
      throw new Error(`Cannot get current price for ${coin}`);
    }

    // Calculate stop loss and take profit prices
    const stopLoss = side === 'buy'
      ? currentPrice * (1 - stopLossPercent / 100)
      : currentPrice * (1 + stopLossPercent / 100);

    const takeProfit = side === 'buy'
      ? currentPrice * (1 + takeProfitPercent / 100)
      : currentPrice * (1 - takeProfitPercent / 100);

    // Create position
    const position: Position = {
      id: this.generatePositionId(),
      botId,
      strategyId,
      coin,
      side,
      entryPrice: currentPrice,
      currentPrice,
      size,
      positionValue: currentPrice * size,
      pnl: 0,
      pnlPercent: 0,
      stopLoss,
      takeProfit,
      openedAt: Date.now(),
      status: 'open',
      mode: 'paper',
    };

    this.positions.set(position.id, position);
    
    console.log(`📄 Paper position opened: ${side.toUpperCase()} ${size} ${coin} @ ${currentPrice}`);
    
    return position;
  }

  /**
   * Close a position (simulated)
   */
  public async closePosition(
    positionId: string,
    reason: string
  ): Promise<Trade> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    // Get current market price
    const exitPrice = this.marketData.getCurrentPrice(position.coin);
    if (!exitPrice) {
      throw new Error(`Cannot get current price for ${position.coin}`);
    }

    // Calculate P&L
    const pnl = this.calculatePnL(position, exitPrice);
    const positionValue = position.positionValue || (position.entryPrice * position.size);
    const pnlPercent = (pnl / positionValue) * 100;
    const holdTime = Date.now() - position.openedAt;

    // Create trade record
    const trade: Trade = {
      id: this.generateTradeId(),
      botId: position.botId,
      strategyId: position.strategyId,
      coin: position.coin,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      pnl,
      pnlPercent,
      holdTime,
      mode: 'paper',
      reason,
      openedAt: position.openedAt,
      closedAt: Date.now(),
    };

    // Store trade
    this.trades.push(trade);
    
    // Remove position
    this.positions.delete(positionId);
    
    console.log(`📄 Paper position closed: ${trade.coin} @ ${exitPrice} | P&L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%) | ${reason}`);
    
    return trade;
  }

  /**
   * Update all positions with current prices
   * Check if stop loss or take profit hit
   */
  public async updatePositions(): Promise<{ closedPositions: Trade[] }> {
    const closedPositions: Trade[] = [];

    for (const [positionId, position] of Array.from(this.positions.entries())) {
      // Get current price
      const currentPrice = this.marketData.getCurrentPrice(position.coin);
      if (!currentPrice) {
        continue;
      }

      // Update position
      position.currentPrice = currentPrice;
      position.pnl = this.calculatePnL(position, currentPrice);
      const positionValue = position.positionValue || (position.entryPrice * position.size);
      position.pnlPercent = (position.pnl / positionValue) * 100;

      // Check stop loss
      if (this.isStopLossHit(position)) {
        const trade = await this.closePosition(positionId, 'Stop loss hit');
        closedPositions.push(trade);
        continue;
      }

      // Check take profit
      if (this.isTakeProfitHit(position)) {
        const trade = await this.closePosition(positionId, 'Take profit hit');
        closedPositions.push(trade);
        continue;
      }
    }

    return { closedPositions };
  }

  /**
   * Calculate P&L for a position
   */
  private calculatePnL(position: Position, currentPrice: number): number {
    if (position.side === 'buy') {
      // Long position: profit when price goes up
      return (currentPrice - position.entryPrice) * position.size;
    } else {
      // Short position: profit when price goes down
      return (position.entryPrice - currentPrice) * position.size;
    }
  }

  /**
   * Check if stop loss is hit
   */
  private isStopLossHit(position: Position): boolean {
    if (!position.stopLoss) return false;
    
    if (position.side === 'buy') {
      return position.currentPrice <= position.stopLoss;
    } else {
      return position.currentPrice >= position.stopLoss;
    }
  }

  /**
   * Check if take profit is hit
   */
  private isTakeProfitHit(position: Position): boolean {
    if (!position.takeProfit) return false;
    
    if (position.side === 'buy') {
      return position.currentPrice >= position.takeProfit;
    } else {
      return position.currentPrice <= position.takeProfit;
    }
  }

  /**
   * Get all open positions
   */
  public getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get positions for a specific bot
   */
  public getBotPositions(botId: string): Position[] {
    return Array.from(this.positions.values()).filter(p => p.botId === botId);
  }

  /**
   * Get all completed trades
   */
  public getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Get trades for a specific bot
   */
  public getBotTrades(botId: string): Trade[] {
    return this.trades.filter(t => t.botId === botId);
  }

  /**
   * Get trade statistics for a bot
   */
  public getBotStatistics(botId: string): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
    avgPnlPercent: number;
    avgHoldTime: number;
    bestTrade: number;
    worstTrade: number;
  } {
    const trades = this.getBotTrades(botId);
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        avgPnlPercent: 0,
        avgHoldTime: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = totalPnl / trades.length;
    const avgPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length;
    const avgHoldTime = trades.reduce((sum, t) => sum + t.holdTime, 0) / trades.length;
    const bestTrade = Math.max(...trades.map(t => t.pnl));
    const worstTrade = Math.min(...trades.map(t => t.pnl));

    return {
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate: (winningTrades / trades.length) * 100,
      totalPnl,
      avgPnl,
      avgPnlPercent,
      avgHoldTime,
      bestTrade,
      worstTrade,
    };
  }

  /**
   * Clear all trades (useful for testing)
   */
  public clearTrades(): void {
    this.trades = [];
  }

  /**
   * Generate unique position ID
   */
  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique trade ID
   */
  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

