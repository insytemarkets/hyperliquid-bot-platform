import { supabase } from './supabaseClient';
import { StrategyConfig, BotInstance } from '../bot-engine/types';

export class SupabasePersistenceService {
  /**
   * Gets the current user ID from Supabase auth
   */
  public static async getCurrentUserId(): Promise<string | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
    if (!user) {
      console.warn('⚠️ No authenticated user found');
      return null;
    }
    console.log('✅ Current user ID:', user.id);
    return user.id;
  }

  /**
   * Tests the connection to Supabase
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('strategies').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('❌ Supabase connection failed:', error);
        return false;
      }
      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
  }

  /**
   * Saves all strategies for the current user
   */
  public static async saveStrategies(strategies: StrategyConfig[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('❌ Cannot save strategies: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    console.log(`💾 Saving ${strategies.length} strategies for user:`, userId);

    try {
      // Delete existing strategies for this user
      await supabase
        .from('strategies')
        .delete()
        .eq('user_id', userId);

      // Insert new strategies
      if (strategies.length > 0) {
        const { error } = await supabase
          .from('strategies')
          .insert(
            strategies.map(strategy => ({
              id: strategy.id,
              user_id: userId,
              name: strategy.name,
              type: strategy.type,
              pairs: strategy.pairs,
              enabled: strategy.enabled,
              mode: strategy.mode,
              position_size: strategy.positionSize,
              max_positions: strategy.maxPositions,
              stop_loss_percent: strategy.stopLossPercent,
              take_profit_percent: strategy.takeProfitPercent,
              parameters: strategy.parameters,
              created_at: new Date(strategy.createdAt).toISOString(),
              updated_at: new Date(strategy.updatedAt).toISOString(),
            }))
          );

        if (error) throw error;
      }

      console.log(`💾 Saved ${strategies.length} strategies to Supabase`);
    } catch (error) {
      console.error('❌ Failed to save strategies to Supabase:', error);
      throw error;
    }
  }

  /**
   * Loads all strategies for the current user
   */
  public static async loadStrategies(): Promise<StrategyConfig[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const strategies = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type as any,
        pairs: row.pairs,
        enabled: row.enabled,
        mode: row.mode as 'paper' | 'live',
        positionSize: row.position_size,
        maxPositions: row.max_positions,
        stopLossPercent: row.stop_loss_percent,
        takeProfitPercent: row.take_profit_percent,
        parameters: row.parameters,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      }));

      console.log(`📂 Loaded ${strategies.length} strategies from Supabase`);
      return strategies;
    } catch (error) {
      console.error('❌ Failed to load strategies from Supabase:', error);
      return [];
    }
  }

  /**
   * Adds a single strategy for the current user
   */
  public static async addStrategy(strategy: StrategyConfig): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .insert({
          id: strategy.id,
          user_id: userId,
          name: strategy.name,
          type: strategy.type,
          pairs: strategy.pairs,
          enabled: strategy.enabled,
          mode: strategy.mode,
          position_size: strategy.positionSize,
          max_positions: strategy.maxPositions,
          stop_loss_percent: strategy.stopLossPercent,
          take_profit_percent: strategy.takeProfitPercent,
          parameters: strategy.parameters,
          created_at: new Date(strategy.createdAt).toISOString(),
          updated_at: new Date(strategy.updatedAt).toISOString(),
        });

      if (error) throw error;
      console.log(`💾 Added strategy ${strategy.name} to Supabase`);
    } catch (error) {
      console.error('❌ Failed to add strategy to Supabase:', error);
      throw error;
    }
  }

  /**
   * Updates a single strategy for the current user
   */
  public static async updateStrategy(strategyId: string, updates: Partial<StrategyConfig>): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.pairs) updateData.pairs = updates.pairs;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.mode) updateData.mode = updates.mode;
      if (updates.positionSize) updateData.position_size = updates.positionSize;
      if (updates.maxPositions) updateData.max_positions = updates.maxPositions;
      if (updates.stopLossPercent) updateData.stop_loss_percent = updates.stopLossPercent;
      if (updates.takeProfitPercent) updateData.take_profit_percent = updates.takeProfitPercent;
      if (updates.parameters) updateData.parameters = updates.parameters;
      if (updates.updatedAt) updateData.updated_at = new Date(updates.updatedAt).toISOString();

      const { error } = await supabase
        .from('strategies')
        .update(updateData)
        .eq('id', strategyId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log(`💾 Updated strategy ${strategyId} in Supabase`);
    } catch (error) {
      console.error('❌ Failed to update strategy in Supabase:', error);
      throw error;
    }
  }

  /**
   * Deletes a single strategy for the current user
   */
  public static async deleteStrategy(strategyId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', strategyId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log(`🗑️ Deleted strategy ${strategyId} from Supabase`);
    } catch (error) {
      console.error('❌ Failed to delete strategy from Supabase:', error);
      throw error;
    }
  }

  /**
   * Saves all deployed bots for the current user
   */
  public static async saveBots(bots: BotInstance[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('❌ Cannot save bots: User not authenticated');
      throw new Error('User not authenticated');
    }
    
    console.log(`🤖 Saving ${bots.length} bots for user:`, userId);

    try {
      // Delete existing bot instances for this user
      await supabase
        .from('bot_instances')
        .delete()
        .eq('user_id', userId);

      // Insert new bot instances
      if (bots.length > 0) {
        const { error } = await supabase
          .from('bot_instances')
          .insert(
            bots.map(bot => ({
              id: bot.id,
              user_id: userId,
              strategy_id: bot.strategyId,
              name: bot.name,
              status: bot.status,
              mode: bot.mode,
              deployed_at: new Date(bot.startedAt).toISOString(),
              updated_at: new Date().toISOString(),
            }))
          );

        if (error) throw error;
      }

      console.log(`💾 Saved ${bots.length} bots to Supabase`);
    } catch (error) {
      console.error('❌ Failed to save bots to Supabase:', error);
      throw error;
    }
  }

  /**
   * Loads all deployed bots for the current user
   */
  public static async loadBots(): Promise<BotInstance[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('bot_instances')
        .select('*')
        .eq('user_id', userId)
        .order('deployed_at', { ascending: false });

      if (error) throw error;

      const bots = (data || []).map(row => ({
        id: row.id,
        strategyId: row.strategy_id,
        name: row.name,
        status: row.status as 'running' | 'paused' | 'stopped',
        mode: row.mode as 'paper' | 'live',
        startedAt: new Date(row.deployed_at).getTime(),
        lastTradeAt: 0,
        positions: [],
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalPnl: 0,
          todayPnl: 0,
          avgHoldTime: 0,
          avgPnlPercent: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
        },
        errorCount: 0,
      }));

      console.log(`📂 Loaded ${bots.length} bots from Supabase`);
      return bots;
    } catch (error) {
      console.error('❌ Failed to load bots from Supabase:', error);
      return [];
    }
  }
}
