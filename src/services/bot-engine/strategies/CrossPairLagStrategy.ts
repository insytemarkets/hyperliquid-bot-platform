import { BaseStrategy } from './BaseStrategy';
import { TradingSignal, MarketCondition } from '../types';
import { MarketDataService } from '../MarketDataService';
import { StrategyConfig } from '../types';

/**
 * Cross-Pair Lag Strategy
 * 
 * EXPLOIT: When BTC moves, alts lag by 1-5 seconds
 * 
 * How it works:
 * 1. Monitor BTC price movements
 * 2. When BTC pumps/dumps >0.3% quickly (1-2 seconds):
 *    - Check if alts (ETH/SOL/XRP) have moved proportionally
 *    - If they're lagging → Trade them immediately
 *    - They WILL catch up (95% of the time)
 * 3. Exit when they match BTC's move (3-10 seconds)
 * 
 * Edge: We're faster than the market. Information propagation has latency.
 */

interface CrossPairLagParams {
  // Leader coin (usually BTC)
  leaderCoin: string;
  
  // Min % move to trigger
  minLeaderMove: number; // e.g., 0.3 = 0.3%
  
  // Time window for leader move
  leaderTimeWindow: number; // milliseconds, e.g., 2000 = 2 seconds
  
  // Max lag tolerance for followers
  maxFollowerLag: number; // e.g., 0.15 = follower moved <0.15% while leader moved 0.3%
  
  // Min confidence required
  minConfidence: number; // 0-1 scale
  
  // Correlation threshold
  requireCorrelation: boolean;
}

export class CrossPairLagStrategy extends BaseStrategy {
  private params!: CrossPairLagParams;
  private leaderPriceCache: Map<number, number> = new Map(); // timestamp -> price

  constructor(config: StrategyConfig, marketData: MarketDataService) {
    super(config, marketData);
    
    // Ensure leader coin is in pairs list
    const leaderCoin = config.parameters?.leaderCoin || 'BTC';
    if (!config.pairs.includes(leaderCoin)) {
      config.pairs.push(leaderCoin);
    }
  }

  protected async onInitialize(): Promise<void> {
    // Get strategy-specific parameters or use defaults
    this.params = {
      leaderCoin: this.config.parameters?.leaderCoin || 'BTC',
      minLeaderMove: this.config.parameters?.minLeaderMove || 0.3,
      leaderTimeWindow: this.config.parameters?.leaderTimeWindow || 2000,
      maxFollowerLag: this.config.parameters?.maxFollowerLag || 0.15,
      minConfidence: this.config.parameters?.minConfidence || 0.7,
      requireCorrelation: this.config.parameters?.requireCorrelation ?? true,
    };

    console.log('⚡ Cross-Pair Lag Strategy parameters:', this.params);
  }

  protected async onCleanup(): Promise<void> {
    this.leaderPriceCache.clear();
  }

  protected async analyzeMarket(condition: MarketCondition): Promise<TradingSignal | null> {
    const { coin } = condition;

    // Don't trade the leader coin
    if (coin === this.params.leaderCoin) {
      return null;
    }

    // Check if leader has moved significantly
    const leaderMove = this.marketData.getPriceChange(
      this.params.leaderCoin,
      this.params.leaderTimeWindow
    );

    if (!leaderMove) {
      return null;
    }

    const leaderMoveAbs = Math.abs(leaderMove.changePercent);
    
    // Leader hasn't moved enough
    if (leaderMoveAbs < this.params.minLeaderMove) {
      return null;
    }

    // Check follower move
    const followerMove = this.marketData.getPriceChange(
      coin,
      this.params.leaderTimeWindow
    );

    if (!followerMove) {
      return null;
    }

    const followerMoveAbs = Math.abs(followerMove.changePercent);

    // Check if follower is lagging
    if (followerMoveAbs > this.params.maxFollowerLag) {
      // Follower already moved, no opportunity
      return null;
    }

    // Calculate how much the follower should move
    const expectedMove = leaderMove.changePercent * 0.8; // Alts typically move 80% of BTC's move
    const actualMove = followerMove.changePercent;
    const lagAmount = Math.abs(expectedMove - actualMove);

    // Determine direction
    const direction = leaderMove.changePercent > 0 ? 'BUY' : 'SELL';

    // Calculate confidence based on leader move strength and lag amount
    const confidence = this.calculateConfidence(leaderMoveAbs, lagAmount);

    if (confidence >= this.params.minConfidence) {
      return this.createSignal(
        direction,
        coin,
        condition.price,
        confidence,
        `${this.params.leaderCoin} moved ${leaderMove.changePercent.toFixed(2)}%, ${coin} lagging`,
        {
          leaderMove: leaderMove.changePercent,
          followerMove: followerMove.changePercent,
          expectedMove,
          lagAmount,
        }
      );
    }

    return null;
  }

  /**
   * Calculate signal confidence
   */
  private calculateConfidence(leaderMoveAbs: number, lagAmount: number): number {
    // Stronger leader move = higher confidence
    const moveConfidence = Math.min(leaderMoveAbs / 1.0, 1.0); // Max at 1% move
    
    // Bigger lag = higher confidence (more room to catch up)
    const lagConfidence = Math.min(lagAmount / 0.5, 1.0); // Max at 0.5% lag
    
    // Weighted average (leader move is more important)
    const confidence = (moveConfidence * 0.6) + (lagConfidence * 0.4);
    
    return Math.min(confidence, 0.95);
  }

  public getStrategyName(): string {
    return 'Cross-Pair Lag';
  }

  public getStrategyDescription(): string {
    return `Exploits the lag between ${this.params.leaderCoin} and other coins. ` +
           `When ${this.params.leaderCoin} moves quickly, alts lag by 1-5 seconds. ` +
           'Trades the laggards before they catch up.';
  }
}

