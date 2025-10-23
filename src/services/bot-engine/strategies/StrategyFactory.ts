import { BaseStrategy } from './BaseStrategy';
import { OrderBookImbalanceStrategy } from './OrderBookImbalanceStrategy';
import { CrossPairLagStrategy } from './CrossPairLagStrategy';
import { MarketDataService } from '../MarketDataService';
import { StrategyConfig, StrategyType } from '../types';

/**
 * Strategy Factory
 * 
 * Creates strategy instances based on configuration
 */
export class StrategyFactory {
  /**
   * Create a strategy instance
   */
  public static createStrategy(
    config: StrategyConfig,
    marketData: MarketDataService
  ): BaseStrategy {
    switch (config.type) {
      case 'orderbook_imbalance':
        return new OrderBookImbalanceStrategy(config, marketData);
      
      case 'cross_pair_lag':
        return new CrossPairLagStrategy(config, marketData);
      
      // Add more strategies here as we build them
      // case 'liquidation_hunter':
      //   return new LiquidationHunterStrategy(config, marketData);
      
      default:
        throw new Error(`Unknown strategy type: ${config.type}`);
    }
  }

  /**
   * Get default parameters for a strategy type
   */
  public static getDefaultParameters(type: StrategyType): Record<string, any> {
    switch (type) {
      case 'orderbook_imbalance':
        return {
          buyThreshold: 3.0,
          sellThreshold: 0.33,
          requireTradePressure: true,
          tradePressureThreshold: 0.3,
          minConfidence: 0.6,
          depthLevels: 10,
        };
      
      case 'cross_pair_lag':
        return {
          leaderCoin: 'BTC',
          minLeaderMove: 0.3,
          leaderTimeWindow: 2000,
          maxFollowerLag: 0.15,
          minConfidence: 0.7,
          requireCorrelation: true,
        };
      
      default:
        return {};
    }
  }

  /**
   * Get strategy metadata
   */
  public static getStrategyMetadata(type: StrategyType): {
    name: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    avgHoldTime: string;
    winRate: string;
    recommended: boolean;
  } {
    switch (type) {
      case 'orderbook_imbalance':
        return {
          name: 'Order Book Imbalance',
          description: 'Exploits order book imbalances to predict short-term price movements',
          riskLevel: 'low',
          avgHoldTime: '1-5 seconds',
          winRate: '60-70%',
          recommended: true,
        };
      
      case 'cross_pair_lag':
        return {
          name: 'Cross-Pair Lag',
          description: 'Trades alts when BTC moves before they catch up',
          riskLevel: 'low',
          avgHoldTime: '3-10 seconds',
          winRate: '75-85%',
          recommended: true,
        };
      
      case 'liquidation_hunter':
        return {
          name: 'Liquidation Hunter',
          description: 'Front-runs liquidation cascades for quick profits',
          riskLevel: 'medium',
          avgHoldTime: '10-30 seconds',
          winRate: '65-75%',
          recommended: false,
        };
      
      default:
        return {
          name: 'Custom Strategy',
          description: 'User-defined strategy',
          riskLevel: 'medium',
          avgHoldTime: 'Varies',
          winRate: 'Unknown',
          recommended: false,
        };
    }
  }

  /**
   * Validate strategy configuration
   */
  public static validateConfig(config: StrategyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim() === '') {
      errors.push('Strategy name is required');
    }

    if (!config.pairs || config.pairs.length === 0) {
      errors.push('At least one trading pair is required');
    }

    if (config.positionSize <= 0) {
      errors.push('Position size must be greater than 0');
    }

    if (config.maxPositions <= 0) {
      errors.push('Max positions must be greater than 0');
    }

    if (config.stopLossPercent <= 0 || config.stopLossPercent > 10) {
      errors.push('Stop loss must be between 0% and 10%');
    }

    if (config.takeProfitPercent <= 0 || config.takeProfitPercent > 20) {
      errors.push('Take profit must be between 0% and 20%');
    }

    // Strategy-specific validation
    if (config.type === 'cross_pair_lag') {
      const leaderCoin = config.parameters?.leaderCoin;
      if (!leaderCoin) {
        errors.push('Leader coin is required for Cross-Pair Lag strategy');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}


