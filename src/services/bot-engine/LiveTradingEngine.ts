import { Position, Trade, OrderSide } from './types';
import { MarketDataService } from './MarketDataService';

/**
 * Live Trading Engine
 * 
 * Executes real trades using Hyperliquid SDK
 * DANGER: This uses real money!
 */

export class LiveTradingEngine {
  private positions: Map<string, Position> = new Map(); // positionId -> Position
  private trades: Trade[] = [];
  private marketData: MarketDataService;
  private exchangeClient: any; // Will be injected from WalletContext
  
  constructor(marketData: MarketDataService) {
    this.marketData = marketData;
  }

  /**
   * Set the exchange client from wallet context
   */
  public setExchangeClient(exchangeClient: any) {
    this.exchangeClient = exchangeClient;
    console.log('🔗 Live trading engine connected to Hyperliquid');
  }

  /**
   * Check if live trading is available
   */
  public isConnected(): boolean {
    return !!this.exchangeClient;
  }

  /**
   * Open a new position (REAL MONEY!)
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
    
    if (!this.exchangeClient) {
      throw new Error('Exchange client not connected - cannot execute live trades');
    }

    const snapshot = this.marketData.getMarketSnapshot(coin);
    if (!snapshot || !snapshot.price) {
      throw new Error(`No market data available for ${coin}`);
    }

    const currentPrice = snapshot.price;
    const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🚨 LIVE TRADE: Opening ${side} position for ${coin} - Size: ${size} @ ${currentPrice}`);
      
      // Prepare order parameters for Hyperliquid
      const orderParams = {
        coin,
        is_buy: side === 'buy',
        sz: size,
        limit_px: currentPrice, // Use current price as limit
        order_type: { limit: { tif: 'Gtc' } }, // Good till cancelled
        reduce_only: false,
      };

      // Execute the order
      const orderResult = await this.exchangeClient.order(orderParams);
      console.log('✅ Live order executed:', orderResult);

      // Create position record
      const position: Position = {
        id: positionId,
        botId,
        strategyId,
        coin,
        side,
        size,
        entryPrice: currentPrice,
        currentPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        stopLoss: side === 'buy' 
          ? currentPrice * (1 - stopLossPercent / 100)
          : currentPrice * (1 + stopLossPercent / 100),
        takeProfit: side === 'buy'
          ? currentPrice * (1 + takeProfitPercent / 100)
          : currentPrice * (1 - takeProfitPercent / 100),
        openedAt: Date.now(),
        status: 'open',
        mode: 'live',
      };

      this.positions.set(positionId, position);
      
      console.log(`🎯 Live position opened: ${coin} ${side} ${size} @ ${currentPrice}`);
      return position;
      
    } catch (error) {
      console.error(`❌ Failed to open live position for ${coin}:`, error);
      throw new Error(`Live trading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close a position (REAL MONEY!)
   */
  public async closePosition(positionId: string, reason: string): Promise<Trade> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    if (!this.exchangeClient) {
      throw new Error('Exchange client not connected - cannot close live position');
    }

    const snapshot = this.marketData.getMarketSnapshot(position.coin);
    if (!snapshot || !snapshot.price) {
      throw new Error(`No market data available for ${position.coin}`);
    }

    const currentPrice = snapshot.price;
    
    try {
      console.log(`🚨 LIVE TRADE: Closing position ${position.coin} @ ${currentPrice} - Reason: ${reason}`);
      
      // Prepare close order (opposite side)
      const closeOrderParams = {
        coin: position.coin,
        is_buy: position.side === 'sell', // Opposite side to close
        sz: position.size,
        limit_px: currentPrice,
        order_type: { limit: { tif: 'Gtc' } },
        reduce_only: true, // This closes the position
      };

      // Execute the close order
      const closeResult = await this.exchangeClient.order(closeOrderParams);
      console.log('✅ Live position closed:', closeResult);

      // Calculate P&L
      const pnl = position.side === 'buy'
        ? (currentPrice - position.entryPrice) * position.size
        : (position.entryPrice - currentPrice) * position.size;

      // Create trade record
      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        botId: position.botId,
        strategyId: position.strategyId,
        coin: position.coin,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        exitPrice: currentPrice,
        pnl,
        pnlPercent: (pnl / (position.entryPrice * position.size)) * 100,
        holdTime: Date.now() - position.openedAt,
        mode: 'live',
        reason,
        openedAt: position.openedAt,
        closedAt: Date.now(),
      };

      // Update position
      position.status = 'closed';
      position.currentPrice = currentPrice;
      position.realizedPnl = pnl;

      this.trades.push(trade);
      this.positions.delete(positionId);

      console.log(`💰 Live trade completed: ${position.coin} P&L: ${pnl.toFixed(4)} (${trade.pnlPercent.toFixed(2)}%)`);
      return trade;
      
    } catch (error) {
      console.error(`❌ Failed to close live position ${positionId}:`, error);
      throw new Error(`Live position close failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update position prices and check stop loss/take profit
   */
  public async updatePositions(): Promise<{ closedPositions: Trade[] }> {
    const closedPositions: Trade[] = [];

    for (const [positionId, position] of Array.from(this.positions.entries())) {
      if (position.status !== 'open') continue;

      const snapshot = this.marketData.getMarketSnapshot(position.coin);
      if (!snapshot || !snapshot.price) continue;

      const currentPrice = snapshot.price;
      
      // Update current price and unrealized P&L
      position.currentPrice = currentPrice;
      position.unrealizedPnl = position.side === 'buy'
        ? (currentPrice - position.entryPrice) * position.size
        : (position.entryPrice - currentPrice) * position.size;

      // Check stop loss
      if (this.isStopLossHit(position)) {
        try {
          const trade = await this.closePosition(positionId, 'Stop loss hit');
          closedPositions.push(trade);
          continue;
        } catch (error) {
          console.error(`Failed to close position on stop loss: ${error}`);
        }
      }

      // Check take profit
      if (this.isTakeProfitHit(position)) {
        try {
          const trade = await this.closePosition(positionId, 'Take profit hit');
          closedPositions.push(trade);
          continue;
        } catch (error) {
          console.error(`Failed to close position on take profit: ${error}`);
        }
      }
    }

    return { closedPositions };
  }

  /**
   * Check if stop loss is hit
   */
  private isStopLossHit(position: Position): boolean {
    if (!position.stopLoss) return false;
    
    return position.side === 'buy'
      ? position.currentPrice <= position.stopLoss
      : position.currentPrice >= position.stopLoss;
  }

  /**
   * Check if take profit is hit
   */
  private isTakeProfitHit(position: Position): boolean {
    if (!position.takeProfit) return false;
    
    return position.side === 'buy'
      ? position.currentPrice >= position.takeProfit
      : position.currentPrice <= position.takeProfit;
  }

  /**
   * Get all positions
   */
  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get all trades
   */
  public getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Get positions for a specific bot
   */
  public getBotPositions(botId: string): Position[] {
    return Array.from(this.positions.values()).filter(p => p.botId === botId);
  }

  /**
   * Get trades for a specific bot
   */
  public getBotTrades(botId: string): Trade[] {
    return this.trades.filter(t => t.botId === botId);
  }
}
