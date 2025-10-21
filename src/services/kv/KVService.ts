import { kv } from '@vercel/kv';
import { StrategyConfig, BotInstance } from '../bot-engine/types';

/**
 * Vercel KV Service for Bot Persistence
 * 
 * Replaces localStorage with Redis-based persistence
 */
export class KVService {
  private static readonly STRATEGIES_KEY = 'bot_strategies';
  private static readonly BOTS_KEY = 'deployed_bots';
  private static readonly BOT_PREFIX = 'bot:';
  private static readonly STRATEGY_PREFIX = 'strategy:';

  /**
   * Save strategies to KV
   */
  static async saveStrategies(strategies: StrategyConfig[]): Promise<void> {
    try {
      await kv.set(this.STRATEGIES_KEY, JSON.stringify(strategies));
      console.log('✅ Strategies saved to KV:', strategies.length);
    } catch (error) {
      console.error('❌ Failed to save strategies to KV:', error);
      // Fallback to localStorage
      localStorage.setItem(this.STRATEGIES_KEY, JSON.stringify(strategies));
    }
  }

  /**
   * Load strategies from KV
   */
  static async loadStrategies(): Promise<StrategyConfig[]> {
    try {
      const data = await kv.get(this.STRATEGIES_KEY);
      if (data && typeof data === 'string') {
        const strategies = JSON.parse(data);
        console.log('✅ Strategies loaded from KV:', strategies.length);
        return strategies;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to load strategies from KV:', error);
      // Fallback to localStorage
      const fallback = localStorage.getItem(this.STRATEGIES_KEY);
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  /**
   * Save deployed bots to KV
   */
  static async saveBots(bots: BotInstance[]): Promise<void> {
    try {
      await kv.set(this.BOTS_KEY, JSON.stringify(bots));
      console.log('✅ Bots saved to KV:', bots.length);
    } catch (error) {
      console.error('❌ Failed to save bots to KV:', error);
      // Fallback to localStorage
      localStorage.setItem(this.BOTS_KEY, JSON.stringify(bots));
    }
  }

  /**
   * Load deployed bots from KV
   */
  static async loadBots(): Promise<BotInstance[]> {
    try {
      const data = await kv.get(this.BOTS_KEY);
      if (data && typeof data === 'string') {
        const bots = JSON.parse(data);
        console.log('✅ Bots loaded from KV:', bots.length);
        return bots;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to load bots from KV:', error);
      // Fallback to localStorage
      const fallback = localStorage.getItem(this.BOTS_KEY);
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  /**
   * Save individual bot data
   */
  static async saveBot(bot: BotInstance): Promise<void> {
    try {
      await kv.set(`${this.BOT_PREFIX}${bot.id}`, JSON.stringify(bot));
      console.log('✅ Bot saved to KV:', bot.name);
    } catch (error) {
      console.error('❌ Failed to save bot to KV:', error);
    }
  }

  /**
   * Load individual bot data
   */
  static async loadBot(botId: string): Promise<BotInstance | null> {
    try {
      const data = await kv.get(`${this.BOT_PREFIX}${botId}`);
      if (data && typeof data === 'string') {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to load bot from KV:', error);
      return null;
    }
  }

  /**
   * Delete bot from KV
   */
  static async deleteBot(botId: string): Promise<void> {
    try {
      await kv.del(`${this.BOT_PREFIX}${botId}`);
      console.log('✅ Bot deleted from KV:', botId);
    } catch (error) {
      console.error('❌ Failed to delete bot from KV:', error);
    }
  }

  /**
   * Save individual strategy
   */
  static async saveStrategy(strategy: StrategyConfig): Promise<void> {
    try {
      await kv.set(`${this.STRATEGY_PREFIX}${strategy.id}`, JSON.stringify(strategy));
      console.log('✅ Strategy saved to KV:', strategy.name);
    } catch (error) {
      console.error('❌ Failed to save strategy to KV:', error);
    }
  }

  /**
   * Load individual strategy
   */
  static async loadStrategy(strategyId: string): Promise<StrategyConfig | null> {
    try {
      const data = await kv.get(`${this.STRATEGY_PREFIX}${strategyId}`);
      if (data && typeof data === 'string') {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to load strategy from KV:', error);
      return null;
    }
  }

  /**
   * Delete strategy from KV
   */
  static async deleteStrategy(strategyId: string): Promise<void> {
    try {
      await kv.del(`${this.STRATEGY_PREFIX}${strategyId}`);
      console.log('✅ Strategy deleted from KV:', strategyId);
    } catch (error) {
      console.error('❌ Failed to delete strategy from KV:', error);
    }
  }

  /**
   * Clear all bot data (for testing)
   */
  static async clearAll(): Promise<void> {
    try {
      await kv.del(this.STRATEGIES_KEY);
      await kv.del(this.BOTS_KEY);
      console.log('✅ All bot data cleared from KV');
    } catch (error) {
      console.error('❌ Failed to clear KV data:', error);
    }
  }

  /**
   * Get KV connection status
   */
  static async getStatus(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test connection with a simple ping
      await kv.set('health_check', Date.now());
      await kv.del('health_check');
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
