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
  
  console.log('🔐 Auth Debug:', { 
    hasSession: !!session, 
    hasToken: !!session?.access_token,
    error: error?.message 
  });
  
  if (!session?.access_token) {
    throw new Error('Unauthorized');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

/**
 * Deploy a new bot
 */
export async function deployBot(strategyId: string) {
  console.log('🚀 API: Deploying bot with strategy:', strategyId);
  
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${FUNCTIONS_BASE_URL}/deploy-bot`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ strategy_id: strategyId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to deploy bot');
    }

    console.log('✅ API: Bot deployed successfully:', result.bot);
    return result.bot;
  } catch (error) {
    console.error('❌ API: Failed to deploy bot:', error);
    throw error;
  }
}

/**
 * Get all user's bots
 */
export async function getBots() {
  console.log('📊 API: Fetching bots...');
  
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${FUNCTIONS_BASE_URL}/get-bots`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch bots');
    }

    console.log('✅ API: Retrieved', result.bots.length, 'bots');
    return result.bots;
  } catch (error) {
    console.error('❌ API: Failed to fetch bots:', error);
    throw error;
  }
}

/**
 * Stop a bot
 */
export async function stopBot(botId: string) {
  console.log('🛑 API: Stopping bot:', botId);
  
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${FUNCTIONS_BASE_URL}/stop-bot`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bot_id: botId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to stop bot');
    }

    console.log('✅ API: Bot stopped successfully:', result.bot);
    return result.bot;
  } catch (error) {
    console.error('❌ API: Failed to stop bot:', error);
    throw error;
  }
}

/**
 * Pause a bot
 */
export async function pauseBot(botId: string) {
  console.log('⏸️ API: Pausing bot:', botId);
  
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${FUNCTIONS_BASE_URL}/pause-bot`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bot_id: botId, action: 'pause' }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to pause bot');
    }

    console.log('✅ API: Bot paused successfully:', result.bot);
    return result.bot;
  } catch (error) {
    console.error('❌ API: Failed to pause bot:', error);
    throw error;
  }
}

/**
 * Resume a bot
 */
export async function resumeBot(botId: string) {
  console.log('▶️ API: Resuming bot:', botId);
  
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${FUNCTIONS_BASE_URL}/pause-bot`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bot_id: botId, action: 'resume' }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to resume bot');
    }

    console.log('✅ API: Bot resumed successfully:', result.bot);
    return result.bot;
  } catch (error) {
    console.error('❌ API: Failed to resume bot:', error);
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
