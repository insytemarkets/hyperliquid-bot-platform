import { BaseStrategy } from './BaseStrategy';
import { MarketDataService } from '../MarketDataService';
import { StrategyConfig, TradingSignal, MarketCondition } from '../types';

/**
 * Multi-Timeframe Breakout Strategy
 * 
 * Advanced strategy that monitors 5m/15m/30m highs with dynamic risk management,
 * volume analysis, and momentum scoring. Long-only quick scalps with tier-based entries.
 */
export class MultiTimeframeBreakoutStrategy extends BaseStrategy {
  private priceHistory: Map<string, Array<{ price: number; timestamp: number; volume: number }>> = new Map();
  private timeframeHighs: Map<string, { 
    high5m: number; 
    high15m: number; 
    high30m: number; 
    lastUpdate: number;
  }> = new Map();
  private momentumScores: Map<string, number> = new Map();
  private volumeProfiles: Map<string, Array<{ price: number; volume: number; timestamp: number }>> = new Map();

  constructor(config: StrategyConfig, marketData: MarketDataService) {
    super(config, marketData);
    this.initializeTimeframes();
  }

  private initializeTimeframes(): void {
    // Initialize tracking for each trading pair
    this.config.pairs.forEach(coin => {
      this.priceHistory.set(coin, []);
      this.timeframeHighs.set(coin, {
        high5m: 0,
        high15m: 0,
        high30m: 0,
        lastUpdate: Date.now()
      });
      this.momentumScores.set(coin, 0);
      this.volumeProfiles.set(coin, []);
    });
  }

  private async generateBreakoutSignal(condition: MarketCondition): Promise<TradingSignal> {
    const { coin, price, timestamp } = condition;
    
    // Update price history
    this.updatePriceHistory(coin, price, timestamp, condition.volatility * 1000); // Use volatility as volume proxy
    
    // Update timeframe highs
    this.updateTimeframeHighs(coin, price, timestamp);
    
    // Calculate momentum score
    const momentumScore = this.calculateMomentumScore(coin, condition);
    this.momentumScores.set(coin, momentumScore);
    
    // Check for breakout conditions
    const breakoutSignal = this.checkBreakoutConditions(coin, price, condition);
    
    if (breakoutSignal.type !== 'NONE') {
      return {
        ...breakoutSignal,
        coin,
        price,
        strategyId: this.config.id,
        timestamp,
        metadata: {
          momentumScore,
          timeframeHighs: this.timeframeHighs.get(coin),
          volumeProfile: this.getVolumeProfile(coin, price),
          riskTier: this.calculateRiskTier(coin, condition)
        }
      };
    }

    return {
      type: 'NONE',
      coin,
      price,
      confidence: 0,
      reason: 'No breakout conditions met',
      strategyId: this.config.id,
      timestamp
    };
  }

  private updatePriceHistory(coin: string, price: number, timestamp: number, volume: number): void {
    const history = this.priceHistory.get(coin) || [];
    
    // Add new price point
    history.push({ price, timestamp, volume });
    
    // Keep only last 30 minutes of data (assuming 1-second intervals)
    const cutoff = timestamp - (30 * 60 * 1000);
    const filteredHistory = history.filter(point => point.timestamp > cutoff);
    
    this.priceHistory.set(coin, filteredHistory);
  }

  private updateTimeframeHighs(coin: string, price: number, timestamp: number): void {
    const highs = this.timeframeHighs.get(coin);
    if (!highs) return;

    const history = this.priceHistory.get(coin) || [];
    
    // Calculate highs for different timeframes
    const now = timestamp;
    const high5m = this.getHighInTimeframe(history, now - (5 * 60 * 1000), now);
    const high15m = this.getHighInTimeframe(history, now - (15 * 60 * 1000), now);
    const high30m = this.getHighInTimeframe(history, now - (30 * 60 * 1000), now);

    this.timeframeHighs.set(coin, {
      high5m: Math.max(high5m, price),
      high15m: Math.max(high15m, price),
      high30m: Math.max(high30m, price),
      lastUpdate: timestamp
    });
  }

  private getHighInTimeframe(history: Array<{ price: number; timestamp: number; volume: number }>, startTime: number, endTime: number): number {
    const relevantPoints = history.filter(point => point.timestamp >= startTime && point.timestamp <= endTime);
    if (relevantPoints.length === 0) return 0;
    return Math.max(...relevantPoints.map(point => point.price));
  }

  private calculateMomentumScore(coin: string, condition: MarketCondition): number {
    const history = this.priceHistory.get(coin) || [];
    if (history.length < 10) return 0;

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, point) => sum + point.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point.price, 0) / older.length;
    
    const priceChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    const volumeWeight = this.calculateVolumeWeight(coin);
    const volatilityBonus = Math.min(condition.volatility * 10, 2); // Cap at 2x bonus
    
    return (priceChange * volumeWeight * volatilityBonus) / 100;
  }

  private calculateVolumeWeight(coin: string): number {
    const profile = this.volumeProfiles.get(coin) || [];
    if (profile.length < 5) return 1;

    const recent = profile.slice(-5);
    const older = profile.slice(-10, -5);
    
    if (older.length === 0) return 1;

    const recentVol = recent.reduce((sum, point) => sum + point.volume, 0) / recent.length;
    const olderVol = older.reduce((sum, point) => sum + point.volume, 0) / older.length;
    
    return Math.max(0.5, Math.min(3, recentVol / olderVol)); // 0.5x to 3x weight
  }

  private checkBreakoutConditions(coin: string, price: number, condition: MarketCondition): Omit<TradingSignal, 'coin' | 'price' | 'strategyId' | 'timestamp'> {
    const highs = this.timeframeHighs.get(coin);
    const momentumScore = this.momentumScores.get(coin) || 0;
    
    if (!highs) {
      return { type: 'NONE', confidence: 0, reason: 'No timeframe data' };
    }

    // Parameters from config
    const params = this.config.parameters;
    const minMomentum = params.minMomentumScore || 0.5;
    const breakoutThreshold = params.breakoutThreshold || 0.002; // 0.2%
    const volumeThreshold = params.volumeThreshold || 1.5;
    const maxRiskTier = params.maxRiskTier || 3;

    // Check if price is breaking above recent highs
    const breakingHigh5m = price > highs.high5m * (1 + breakoutThreshold);
    const breakingHigh15m = price > highs.high15m * (1 + breakoutThreshold);
    const breakingHigh30m = price > highs.high30m * (1 + breakoutThreshold);

    // Momentum requirements
    const hasMomentum = momentumScore > minMomentum;
    const hasVolume = this.calculateVolumeWeight(coin) > volumeThreshold;
    const riskTier = this.calculateRiskTier(coin, condition);
    const withinRiskLimits = riskTier <= maxRiskTier;

    // Tier-based entry logic
    let confidence = 0;
    let reason = '';

    if (breakingHigh30m && hasMomentum && hasVolume && withinRiskLimits) {
      confidence = 0.9;
      reason = 'Tier 1: Breaking 30m high with strong momentum and volume';
    } else if (breakingHigh15m && hasMomentum && hasVolume && withinRiskLimits) {
      confidence = 0.75;
      reason = 'Tier 2: Breaking 15m high with good momentum and volume';
    } else if (breakingHigh5m && hasMomentum && withinRiskLimits) {
      confidence = 0.6;
      reason = 'Tier 3: Breaking 5m high with momentum';
    } else {
      return { 
        type: 'NONE', 
        confidence: 0, 
        reason: `No breakout: 5m=${breakingHigh5m}, 15m=${breakingHigh15m}, 30m=${breakingHigh30m}, momentum=${hasMomentum}, volume=${hasVolume}, risk=${withinRiskLimits}` 
      };
    }

    // Only long positions for this strategy
    return {
      type: 'BUY',
      confidence,
      reason
    };
  }

  private calculateRiskTier(coin: string, condition: MarketCondition): number {
    // Risk tier based on volatility, momentum, and market conditions
    const volatilityRisk = Math.min(4, condition.volatility * 20); // 0-4 scale
    const momentumRisk = Math.abs(this.momentumScores.get(coin) || 0) > 2 ? 2 : 1;
    const imbalanceRisk = Math.abs(condition.orderBookImbalance - 1) > 0.5 ? 1 : 0;
    
    return Math.ceil((volatilityRisk + momentumRisk + imbalanceRisk) / 3);
  }

  private getVolumeProfile(coin: string, currentPrice: number): { avgVolume: number; priceLevel: string } {
    const profile = this.volumeProfiles.get(coin) || [];
    if (profile.length === 0) return { avgVolume: 0, priceLevel: 'unknown' };

    const recent = profile.slice(-10);
    const avgVolume = recent.reduce((sum, point) => sum + point.volume, 0) / recent.length;
    
    // Determine price level relative to recent range
    const prices = recent.map(point => point.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    
    let priceLevel = 'middle';
    if (currentPrice > maxPrice - (range * 0.2)) priceLevel = 'high';
    else if (currentPrice < minPrice + (range * 0.2)) priceLevel = 'low';
    
    return { avgVolume, priceLevel };
  }

  protected shouldExit(position: any, currentCondition: MarketCondition): { shouldExit: boolean; reason: string } {
    const { coin, entryPrice, openedAt } = position;
    const { price, timestamp } = currentCondition;
    
    const holdTime = timestamp - openedAt;
    const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
    
    // Quick exit conditions for scalping
    const maxHoldTime = this.config.parameters.maxHoldTime || 60000; // 1 minute default
    const quickProfitTarget = this.config.parameters.quickProfitTarget || 0.3; // 0.3%
    const emergencyStopLoss = this.config.parameters.emergencyStopLoss || -0.5; // -0.5%
    
    // Take quick profits
    if (pnlPercent >= quickProfitTarget) {
      return { shouldExit: true, reason: `Quick profit target hit: ${pnlPercent.toFixed(2)}%` };
    }
    
    // Emergency stop loss
    if (pnlPercent <= emergencyStopLoss) {
      return { shouldExit: true, reason: `Emergency stop loss: ${pnlPercent.toFixed(2)}%` };
    }
    
    // Time-based exit
    if (holdTime > maxHoldTime) {
      return { shouldExit: true, reason: `Max hold time exceeded: ${holdTime}ms` };
    }
    
    // Momentum reversal exit
    const currentMomentum = this.momentumScores.get(coin) || 0;
    if (currentMomentum < -0.2) { // Momentum turned negative
      return { shouldExit: true, reason: `Momentum reversal: ${currentMomentum.toFixed(3)}` };
    }
    
    return { shouldExit: false, reason: '' };
  }

  // Required abstract methods from BaseStrategy
  protected async onInitialize(): Promise<void> {
    this.initializeTimeframes();
  }

  protected async onCleanup(): Promise<void> {
    this.priceHistory.clear();
    this.timeframeHighs.clear();
    this.momentumScores.clear();
    this.volumeProfiles.clear();
  }

  protected async analyzeMarket(condition: MarketCondition): Promise<TradingSignal | null> {
    const signal = await this.generateBreakoutSignal(condition);
    return signal.type !== 'NONE' ? signal : null;
  }

  public getStrategyName(): string {
    return 'Multi-Timeframe Breakout';
  }

  public getStrategyDescription(): string {
    return 'Advanced breakout strategy using 5m/15m/30m timeframes with dynamic risk management, volume analysis, and momentum scoring. Long-only quick scalps with tier-based entries.';
  }

  public getStrategyInfo(): { name: string; description: string; parameters: Record<string, any> } {
    return {
      name: this.getStrategyName(),
      description: this.getStrategyDescription(),
      parameters: {
        minMomentumScore: 'Minimum momentum score required for entry (default: 0.5)',
        breakoutThreshold: 'Price breakout threshold as percentage (default: 0.002)',
        volumeThreshold: 'Volume weight threshold (default: 1.5)',
        maxRiskTier: 'Maximum risk tier allowed (1-4, default: 3)',
        maxHoldTime: 'Maximum hold time in milliseconds (default: 60000)',
        quickProfitTarget: 'Quick profit target percentage (default: 0.3)',
        emergencyStopLoss: 'Emergency stop loss percentage (default: -0.5)'
      }
    };
  }
}
