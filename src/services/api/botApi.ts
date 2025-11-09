/**
 * Bot API Service - Calls Supabase Edge Functions
 * This replaces the local bot engine with server-side calls
 */

import { supabase } from '../supabase/supabaseClient';

const FUNCTIONS_BASE_URL = 'https://oqmaogkrkupqulcregpz.supabase.co/functions/v1';

/**
 * Deploy a new bot - directly to Supabase, no Edge Function!
 */
export async function deployBot(strategyId: string) {
  console.log('🚀 API: Deploying bot directly to Supabase with strategy:', strategyId);
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get the strategy first
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (strategyError || !strategy) {
      throw new Error('Strategy not found');
    }

    // Create bot instance directly in Supabase
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data: bot, error: botError } = await supabase
      .from('bot_instances')
      .insert({
        id: botId,
        user_id: user.id, // ✅ Add user_id!
        strategy_id: strategyId,
        name: strategy.name,
        status: 'running',
        mode: strategy.mode,
        deployed_at: new Date().toISOString(),
        last_tick_at: new Date().toISOString(),
        error_count: 0,
      })
      .select()
      .single();

    if (botError) {
      console.error('❌ Failed to create bot:', botError);
      throw new Error(botError.message);
    }

    console.log('✅ Bot deployed directly to Supabase:', bot.name);
    return bot;
  } catch (error) {
    console.error('❌ Failed to deploy bot:', error);
    throw error;
  }
}

/**
 * Get all user's bots
 */
export async function getBots() {
  console.log('📊 API: Fetching bots directly from Supabase...');
  
  try {
    // Fetch directly from Supabase using RLS - no Edge Function needed!
    const { data: bots, error } = await supabase
      .from('bot_instances')
      .select('*')
      .order('deployed_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Retrieved', bots?.length || 0, 'bots from Supabase');
    
    // Fetch positions and trades for each bot to calculate real stats
    const botsWithStats = await Promise.all((bots || []).map(async (bot) => {
      // Fetch open positions
      const { data: positions } = await supabase
        .from('bot_positions')
        .select('*')
        .eq('bot_id', bot.id)
        .eq('status', 'open');
      
      // Fetch all trades
      const { data: trades } = await supabase
        .from('bot_trades')
        .select('*')
        .eq('bot_id', bot.id)
        .order('executed_at', { ascending: false });
      
      // Calculate performance stats
      const totalTrades = trades?.length || 0;
      const openPositions = positions || [];
      
      // Calculate P&L from closed positions (positions with status='closed')
      const { data: closedPositions } = await supabase
        .from('bot_positions')
        .select('*')
        .eq('bot_id', bot.id)
        .eq('status', 'closed');
      
      // Calculate realized P&L from closed positions
      const realizedPnl = closedPositions?.reduce((sum, pos) => {
        const pnl = pos.unrealized_pnl || 0;
        return sum + pnl;
      }, 0) || 0;
      
      // Calculate unrealized P&L from open positions
      const unrealizedPnl = openPositions.reduce((sum, pos) => {
        const pnl = pos.unrealized_pnl || 0;
        return sum + pnl;
      }, 0);
      
      // Calculate today's P&L (positions opened today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPnl = (openPositions.concat(closedPositions || []))
        .filter(pos => {
          const openedAt = new Date(pos.opened_at);
          return openedAt >= today;
        })
        .reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
      
      // Calculate win rate from closed positions
      const winningTrades = closedPositions?.filter(pos => (pos.unrealized_pnl || 0) > 0).length || 0;
      const losingTrades = closedPositions?.filter(pos => (pos.unrealized_pnl || 0) < 0).length || 0;
      const winRate = closedPositions && closedPositions.length > 0
        ? (winningTrades / closedPositions.length) * 100
        : 0;
      
      return {
        ...bot,
        positions: openPositions,
        performance: {
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          totalPnl: realizedPnl + unrealizedPnl,
          todayPnl,
          unrealizedPnl,
          realizedPnl,
        }
      };
    }));
    
    return botsWithStats;
  } catch (error) {
    console.error('❌ Failed to fetch bots from Supabase:', error);
    throw error;
  }
}

/**
 * Stop a bot - directly in Supabase
 */
export async function stopBot(botId: string) {
  console.log('🛑 API: Stopping bot directly in Supabase:', botId);
  
  try {
    const { data: bot, error } = await supabase
      .from('bot_instances')
      .update({ status: 'stopped' })
      .eq('id', botId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to stop bot:', error);
      throw new Error(error.message);
    }

    console.log('✅ Bot stopped:', bot.name);
    return bot;
  } catch (error) {
    console.error('❌ Failed to stop bot:', error);
    throw error;
  }
}

/**
 * Pause a bot - directly in Supabase
 */
export async function pauseBot(botId: string) {
  console.log('⏸️ API: Pausing bot directly in Supabase:', botId);
  
  try {
    const { data: bot, error } = await supabase
      .from('bot_instances')
      .update({ status: 'paused' })
      .eq('id', botId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to pause bot:', error);
      throw new Error(error.message);
    }

    console.log('✅ Bot paused:', bot.name);
    return bot;
  } catch (error) {
    console.error('❌ Failed to pause bot:', error);
    throw error;
  }
}

/**
 * Resume a bot - directly in Supabase
 */
export async function resumeBot(botId: string) {
  console.log('▶️ API: Resuming bot directly in Supabase:', botId);
  
  try {
    const { data: bot, error } = await supabase
      .from('bot_instances')
      .update({ status: 'running' })
      .eq('id', botId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to resume bot:', error);
      throw new Error(error.message);
    }

    console.log('✅ Bot resumed:', bot.name);
    return bot;
  } catch (error) {
    console.error('❌ Failed to resume bot:', error);
    throw error;
  }
}

/**
 * Manually trigger bot-runner (for testing)
 */
export async function triggerBotRunner() {
  console.log('🤖 API: Manually triggering bot-runner...');
  
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/bot-runner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to trigger bot-runner');
    }

    console.log('✅ API: Bot-runner executed:', result);
    return result;
  } catch (error) {
    console.error('❌ API: Failed to trigger bot-runner:', error);
    throw error;
  }
}

/**
 * Get logs for a specific bot
 */
export async function getBotLogs(botId: string, limit: number = 100) {
  console.log('📋 API: Fetching logs for bot:', botId);
  
  try {
    const { data: logs, error } = await supabase
      .from('bot_logs')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Retrieved', logs?.length || 0, 'logs');
    return logs || [];
  } catch (error) {
    console.error('❌ Failed to fetch bot logs:', error);
    throw error;
  }
}

/**
 * Get trades for a specific bot
 */
export async function getBotTrades(botId: string, limit: number = 50) {
  console.log('📊 API: Fetching trades for bot:', botId);
  
  try {
    // Fetch trades
    const { data: trades, error: tradesError } = await supabase
      .from('bot_trades')
      .select('*')
      .eq('bot_id', botId)
      .order('executed_at', { ascending: false })
      .limit(limit * 2); // Get more to account for entry/exit pairs

    if (tradesError) {
      console.error('❌ Supabase error fetching trades:', tradesError);
      throw new Error(tradesError.message);
    }

    // Fetch positions to get entry_price, stop_loss, take_profit, status
    const { data: positions, error: positionsError } = await supabase
      .from('bot_positions')
      .select('*')
      .eq('bot_id', botId);

    if (positionsError) {
      console.error('❌ Supabase error fetching positions:', positionsError);
      throw new Error(positionsError.message);
    }

    // Create position map for quick lookup
    const positionMap = new Map<string, any>();
    positions?.forEach((pos: any) => {
      positionMap.set(pos.id, pos);
    });

    // Process trades to group entry/exit pairs
    const processedTrades: any[] = [];
    const tradeMap = new Map<string, any>();

    // Group trades by position_id
    trades?.forEach((trade: any) => {
      const positionId = trade.position_id;
      
      if (!tradeMap.has(positionId)) {
        tradeMap.set(positionId, {
          position_id: positionId,
          symbol: trade.symbol,
          entry_trade: null,
          exit_trade: null,
          position: positionMap.get(positionId) || null
        });
      }

      const tradeData = tradeMap.get(positionId);
      
      if (trade.side === 'buy') {
        tradeData.entry_trade = trade;
      } else if (trade.side === 'sell') {
        tradeData.exit_trade = trade;
      }
    });

    // Convert to trade pairs
    tradeMap.forEach((tradeData) => {
      const position = tradeData.position;
      
      if (tradeData.entry_trade && tradeData.exit_trade) {
        // Closed position - has both entry and exit
        const entryPrice = position?.entry_price || tradeData.entry_trade.price;
        const exitPrice = tradeData.exit_trade.price;
        const pnl = tradeData.exit_trade.pnl || 0;
        const pnlPct = entryPrice ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;

        // Determine reason from position status or price comparison
        let reason = 'Closed';
        if (position) {
          if (position.status === 'closed') {
            // Check if it hit TP or SL
            if (position.take_profit && Math.abs(exitPrice - position.take_profit) < 0.01) {
              reason = 'Take Profit';
            } else if (position.stop_loss && Math.abs(exitPrice - position.stop_loss) < 0.01) {
              reason = 'Stop Loss';
            }
          }
        }

        processedTrades.push({
          id: tradeData.position_id,
          symbol: tradeData.symbol,
          entry_price: entryPrice,
          exit_price: exitPrice,
          entry_time: tradeData.entry_trade.executed_at,
          exit_time: tradeData.exit_trade.executed_at,
          pnl: pnl,
          pnl_pct: pnlPct,
          size: tradeData.entry_trade.size,
          side: 'long',
          reason: reason
        });
      } else if (tradeData.entry_trade && !tradeData.exit_trade) {
        // Open position - only entry
        processedTrades.push({
          id: tradeData.position_id,
          symbol: tradeData.symbol,
          entry_price: position?.entry_price || tradeData.entry_trade.price,
          exit_price: null,
          entry_time: tradeData.entry_trade.executed_at,
          exit_time: null,
          pnl: position?.unrealized_pnl || 0,
          pnl_pct: 0,
          size: tradeData.entry_trade.size,
          side: 'long',
          reason: 'Open'
        });
      }
    });

    // Sort by exit_time (most recent first), then by entry_time for open positions
    processedTrades.sort((a, b) => {
      const aTime = a.exit_time || a.entry_time;
      const bTime = b.exit_time || b.entry_time;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    console.log('✅ Retrieved', processedTrades.length, 'trades');
    return processedTrades.slice(0, limit); // Return only requested limit
  } catch (error) {
    console.error('❌ Failed to fetch bot trades:', error);
    throw error;
  }
}
