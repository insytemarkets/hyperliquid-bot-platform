import { BaseStrategy } from './BaseStrategy';
import { TradingSignal, MarketCondition } from '../types';

/**
 * Order Book Imbalance Strategy
 * 
 * EXPLOIT: Order book imbalances predict short-term price movements
 * 
 * How it works:
 * 1. Monitor bid/ask depth ratio in real-time
 * 2. When imbalance exceeds threshold (e.g., 3:1):
 *    - Heavy bids → Price going up → BUY
 *    - Heavy asks → Price going down → SELL
 * 3. Exit quickly (1-3 seconds) or hit profit target (0.1-0.3%)
 * 
 * Edge: Most traders react AFTER price moves. We react to ORDER FLOW before price moves.
 */

interface OrderBookImbalanceParams {
  // Imbalance threshold (bid/ask ratio)
  buyThreshold: number; // e.g., 3.0 = 3x more bids than asks
  sellThreshold: number; // e.g., 0.33 = 3x more asks than bids
  
  // Trade pressure confirmation
  requireTradePressure: boolean;
  tradePressureThreshold: number; // e.g., 0.3 = 30% buy pressure
  
  // Min confidence required
  minConfidence: number; // 0-1 scale
  
  // Depth levels to analyze
  depthLevels: number; // e.g., 10 = top 10 levels
}

export class OrderBookImbalanceStrategy extends BaseStrategy {
  private params!: OrderBookImbalanceParams;

  protected async onInitialize(): Promise<void> {
    // Get strategy-specific parameters or use defaults
    this.params = {
      buyThreshold: this.config.parameters?.buyThreshold || 3.0,
      sellThreshold: this.config.parameters?.sellThreshold || 0.33,
      requireTradePressure: this.config.parameters?.requireTradePressure ?? true,
      tradePressureThreshold: this.config.parameters?.tradePressureThreshold || 0.3,
      minConfidence: this.config.parameters?.minConfidence || 0.6,
      depthLevels: this.config.parameters?.depthLevels || 10,
    };

    console.log('📊 Order Book Imbalance Strategy parameters:', this.params);
  }

  protected async onCleanup(): Promise<void> {
    // No cleanup needed for this strategy
  }

  protected async analyzeMarket(condition: MarketCondition): Promise<TradingSignal | null> {
    const { coin, price, orderBookImbalance, tradePressure } = condition;

    // Check for BUY signal (heavy bid pressure)
    if (orderBookImbalance >= this.params.buyThreshold) {
      // Optional: Confirm with trade pressure
      if (this.params.requireTradePressure && tradePressure < this.params.tradePressureThreshold) {
        return null;
      }

      // Calculate confidence based on imbalance strength
      const confidence = this.calculateConfidence(orderBookImbalance, this.params.buyThreshold, 'buy');
      
      if (confidence >= this.params.minConfidence) {
        return this.createSignal(
          'BUY',
          coin,
          price,
          confidence,
          `Order book imbalance: ${orderBookImbalance.toFixed(2)}:1 (Buy pressure)`,
          {
            imbalance: orderBookImbalance,
            tradePressure,
            threshold: this.params.buyThreshold,
          }
        );
      }
    }

    // Check for SELL signal (heavy ask pressure)
    if (orderBookImbalance <= this.params.sellThreshold) {
      // Optional: Confirm with trade pressure
      if (this.params.requireTradePressure && tradePressure > -this.params.tradePressureThreshold) {
        return null;
      }

      // Calculate confidence based on imbalance strength
      const confidence = this.calculateConfidence(orderBookImbalance, this.params.sellThreshold, 'sell');
      
      if (confidence >= this.params.minConfidence) {
        return this.createSignal(
          'SELL',
          coin,
          price,
          confidence,
          `Order book imbalance: ${orderBookImbalance.toFixed(2)}:1 (Sell pressure)`,
          {
            imbalance: orderBookImbalance,
            tradePressure,
            threshold: this.params.sellThreshold,
          }
        );
      }
    }

    return null;
  }

  /**
   * Calculate signal confidence based on imbalance strength
   */
  private calculateConfidence(imbalance: number, threshold: number, side: 'buy' | 'sell'): number {
    if (side === 'buy') {
      // For buy signals: more imbalance = higher confidence
      // 3.0 threshold: 3.0 = 60%, 4.0 = 75%, 5.0 = 85%, 6.0+ = 95%
      const excessImbalance = imbalance - threshold;
      const confidence = 0.6 + (excessImbalance / threshold) * 0.35;
      return Math.min(confidence, 0.95);
    } else {
      // For sell signals: lower imbalance = higher confidence
      // 0.33 threshold: 0.33 = 60%, 0.25 = 75%, 0.20 = 85%, 0.15- = 95%
      const excessImbalance = threshold - imbalance;
      const confidence = 0.6 + (excessImbalance / threshold) * 0.35;
      return Math.min(confidence, 0.95);
    }
  }

  public getStrategyName(): string {
    return 'Order Book Imbalance';
  }

  public getStrategyDescription(): string {
    return 'Exploits order book imbalances to predict short-term price movements. ' +
           'Trades in the direction of order flow before price catches up.';
  }
}

