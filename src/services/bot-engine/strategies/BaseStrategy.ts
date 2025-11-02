import { MarketDataService, MarketSnapshot } from '../MarketDataService';
import { TradingSignal, SignalType, StrategyConfig, MarketCondition } from '../types';

/**
 * Base Strategy Class
 * 
 * All trading strategies inherit from this
 * Provides common functionality and interface
 */
export abstract class BaseStrategy {
  protected config: StrategyConfig;
  protected marketData: MarketDataService;
  
  constructor(config: StrategyConfig, marketData: MarketDataService) {
    this.config = config;
    this.marketData = marketData;
  }

  /**
   * Initialize the strategy
   * Subscribe to market data for all pairs
   */
  public async initialize(): Promise<void> {
    console.log(`🚀 Initializing strategy: ${this.config.name}`);
    
    // Subscribe to all pairs
    for (const coin of this.config.pairs) {
      this.marketData.subscribeToCoin(coin);
    }
    
    await this.onInitialize();
    console.log(`✅ Strategy initialized: ${this.config.name}`);
  }

  /**
   * Cleanup strategy
   */
  public async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up strategy: ${this.config.name}`);
    
    // Unsubscribe from all pairs
    for (const coin of this.config.pairs) {
      this.marketData.unsubscribeFromCoin(coin);
    }
    
    await this.onCleanup();
    console.log(`✅ Strategy cleaned up: ${this.config.name}`);
  }

  /**
   * Generate trading signal for a coin
   * This is the main entry point called by the bot engine
   */
  public async generateSignal(coin: string): Promise<TradingSignal | null> {
    if (!this.config.enabled) {
      return null;
    }

    if (!this.config.pairs.includes(coin)) {
      return null;
    }

    try {
      // Get market data
      const snapshot = this.marketData.getMarketSnapshot(coin);
      if (!snapshot || !snapshot.price) {
        return null;
      }

      // Build market condition
      const condition = this.buildMarketCondition(coin, snapshot);
      if (!condition) {
        return null;
      }

      // Call strategy-specific logic
      const signal = await this.analyzeMarket(condition);
      
      if (signal && signal.type !== 'NONE') {
        console.log(`📊 Signal generated: ${signal.type} ${coin} @ ${signal.price} (${signal.reason})`);
      }

      return signal;
    } catch (error) {
      console.error(`❌ Error generating signal for ${coin}:`, error);
      return null;
    }
  }

  /**
   * Build market condition from snapshot
   */
  protected buildMarketCondition(coin: string, snapshot: MarketSnapshot): MarketCondition | null {
    const priceChange1m = this.marketData.getPriceChange(coin, 60000); // 1 minute
    const priceChange5m = this.marketData.getPriceChange(coin, 300000); // 5 minutes
    const orderBookImbalance = this.marketData.getOrderBookImbalance(coin, 10);
    const tradePressure = this.marketData.getTradePressure(coin, 20);

    if (orderBookImbalance === null || tradePressure === null) {
      return null;
    }

    return {
      coin,
      price: snapshot.price,
      priceChange1m: priceChange1m?.changePercent || 0,
      priceChange5m: priceChange5m?.changePercent || 0,
      orderBookImbalance,
      tradePressure,
      volatility: this.calculateVolatility(coin),
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate price volatility (standard deviation)
   */
  protected calculateVolatility(coin: string): number {
    // Simple volatility calculation based on recent price changes
    const changes: number[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const change = this.marketData.getPriceChange(coin, i * 60000); // Every minute
      if (change) {
        changes.push(Math.abs(change.changePercent));
      }
    }

    if (changes.length === 0) return 0;

    const mean = changes.reduce((sum, val) => sum + val, 0) / changes.length;
    const variance = changes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / changes.length;
    return Math.sqrt(variance);
  }

  /**
   * Create a trading signal
   */
  protected createSignal(
    type: SignalType,
    coin: string,
    price: number,
    confidence: number,
    reason: string,
    metadata?: Record<string, any>
  ): TradingSignal {
    return {
      type,
      coin,
      price,
      confidence,
      reason,
      strategyId: this.config.id,
      timestamp: Date.now(),
      metadata,
    };
  }

  /**
   * Get strategy configuration
   */
  public getConfig(): StrategyConfig {
    return this.config;
  }

  /**
   * Update strategy configuration
   */
  public updateConfig(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config, updatedAt: Date.now() };
  }

  // ==================== ABSTRACT METHODS ====================
  // Strategies must implement these

  /**
   * Strategy-specific initialization
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Strategy-specific cleanup
   */
  protected abstract onCleanup(): Promise<void>;

  /**
   * Analyze market and generate signal
   * This is where the strategy logic goes
   */
  protected abstract analyzeMarket(condition: MarketCondition): Promise<TradingSignal | null>;

  /**
   * Get strategy name
   */
  public abstract getStrategyName(): string;

  /**
   * Get strategy description
   */
  public abstract getStrategyDescription(): string;
}





