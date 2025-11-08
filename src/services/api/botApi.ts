/**
 * Bot API Service - Calls Supabase Edge Functions
 * This replaces the local bot engine with server-side calls
 */

import { supabase } from '../supabase/supabaseClient';
import { StrategyConfig } from '../bot-engine/types';

const FUNCTIONS_BASE_URL = 'https://oqmaogkrkupqulcregpz.supabase.co/functions/v1';

/**
 * Get auth headers for API calls
 */
async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('🔐 Auth session check:', { 
    hasSession: !!session, 
    hasAccessToken: !!session?.access_token,
    error: error?.message 
  });
  
  if (error) {
    console.error('❌ Session error:', error);
    throw new Error(`Session error: ${error.message}`);
  }
  
  if (!session?.access_token) {
    console.error('❌ No session or access token found');
    throw new Error('Not authenticated - please log in again');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

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
