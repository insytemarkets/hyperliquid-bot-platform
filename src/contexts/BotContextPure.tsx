/**
 * PURE Dashboard BotContext - NO BOT ENGINE
 * Frontend is ONLY a dashboard - bots run 100% on server
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyConfig } from '../services/bot-engine/types';
import { SupabasePersistenceService } from '../services/supabase/SupabasePersistenceService';
import * as BotAPI from '../services/api/botApi';

// Server bot instance (read-only from frontend perspective)
interface ServerBotInstance {
  id: string;
  user_id: string;
  strategy_id: string;
  name: string;
  status: 'running' | 'paused' | 'stopped';
  mode: 'paper' | 'live';
  deployed_at: string;
  updated_at: string;
  last_tick_at?: string;
  error_count: number;
  positions: any[];
  performance: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    todayPnl: number;
    unrealizedPnl: number;
    realizedPnl: number;
  };
}

interface BotContextType {
  // Strategies (frontend manages these)
  strategies: StrategyConfig[];
  addStrategy: (strategy: StrategyConfig) => Promise<void>;
  updateStrategy: (id: string, strategy: Partial<StrategyConfig>) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  getStrategy: (id: string) => StrategyConfig | undefined;

  // Bots (read-only dashboard - server manages these)
  bots: ServerBotInstance[];
  deployBot: (strategyId: string) => Promise<void>;
  pauseBot: (botId: string) => Promise<void>;
  resumeBot: (botId: string) => Promise<void>;
  stopBot: (botId: string) => Promise<void>;
  refreshBots: () => Promise<void>;

  // State
  loading: boolean;
  error: string | null;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export const useBot = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};

interface BotProviderProps {
  children: ReactNode;
}

export const BotProvider: React.FC<BotProviderProps> = ({ children }) => {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [bots, setBots] = useState<ServerBotInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load strategies and bots on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Auto-refresh bots every 15 seconds to show live updates from server
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBots();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    console.log('📊 Loading dashboard data (strategies + server bot status)...');
    setLoading(true);
    
    try {
      // Load strategies from Supabase
      const loadedStrategies = await SupabasePersistenceService.loadStrategies();
      setStrategies(loadedStrategies);
      console.log('📋 Loaded', loadedStrategies.length, 'strategies');

      // Fetch current bot status from server
      await refreshBots();
      
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = async () => {
    try {
      console.log('🔄 Fetching live bot status from server...');
      const serverBots = await BotAPI.getBots();
      setBots(serverBots);
      console.log('✅ Server reports', serverBots.length, 'bots');
      
      if (serverBots.length > 0) {
        console.log('🤖 Bot statuses:', serverBots.map((b: ServerBotInstance) => `${b.name}: ${b.status}`));
      }
    } catch (error) {
      console.error('❌ Failed to fetch bots from server:', error);
      // Don't set error state for refresh failures, just log them
    }
  };

  const addStrategy = async (strategy: StrategyConfig) => {
    try {
      setLoading(true);
      await SupabasePersistenceService.addStrategy(strategy);
      setStrategies([...strategies, strategy]);
      console.log('✅ Strategy saved:', strategy.name);
    } catch (error) {
      console.error('❌ Failed to add strategy:', error);
      setError('Failed to save strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStrategy = async (id: string, updates: Partial<StrategyConfig>) => {
    try {
      setLoading(true);
      await SupabasePersistenceService.updateStrategy(id, updates);
      
      const updatedStrategies = strategies.map(s => 
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
      );
      setStrategies(updatedStrategies);
      console.log('✅ Strategy updated:', id);
    } catch (error) {
      console.error('❌ Failed to update strategy:', error);
      setError('Failed to update strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      setLoading(true);
      await SupabasePersistenceService.deleteStrategy(id);
      setStrategies(strategies.filter(s => s.id !== id));
      console.log('✅ Strategy deleted:', id);
    } catch (error) {
      console.error('❌ Failed to delete strategy:', error);
      setError('Failed to delete strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrategy = (id: string) => {
    return strategies.find(s => s.id === id);
  };

  const deployBot = async (strategyId: string) => {
    const strategy = getStrategy(strategyId);
    if (!strategy) {
      setError('Strategy not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Deploying bot to server:', strategy.name);
      console.log('📡 Calling deploy-bot Edge Function...');
      
      // Call Edge Function to deploy bot on server
      const deployedBot = await BotAPI.deployBot(strategyId);
      
      console.log('✅ Bot deployed to server:', deployedBot.name);
      console.log('🔥 Bot is now running 24/7 on Supabase Edge Functions!');
      console.log('⏰ Cron job will execute bot every 30 seconds');
      
      // Refresh bots to show the new one
      setTimeout(() => refreshBots(), 2000);
      
    } catch (error) {
      console.error('❌ Failed to deploy bot to server:', error);
      setError(error instanceof Error ? error.message : 'Failed to deploy bot');
    } finally {
      setLoading(false);
    }
  };

  const pauseBot = async (botId: string) => {
    try {
      console.log('⏸️ Pausing server bot:', botId);
      await BotAPI.pauseBot(botId);
      
      // Update local state immediately for better UX
      setBots(prevBots => 
        prevBots.map(bot => 
          bot.id === botId ? { ...bot, status: 'paused' as const } : bot
        )
      );
      
      console.log('✅ Bot paused on server');
      
    } catch (error) {
      console.error('❌ Failed to pause server bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to pause bot');
    }
  };

  const resumeBot = async (botId: string) => {
    try {
      console.log('▶️ Resuming server bot:', botId);
      await BotAPI.resumeBot(botId);
      
      // Update local state immediately for better UX
      setBots(prevBots => 
        prevBots.map(bot => 
          bot.id === botId ? { ...bot, status: 'running' as const } : bot
        )
      );
      
      console.log('✅ Bot resumed on server');
      
    } catch (error) {
      console.error('❌ Failed to resume server bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to resume bot');
    }
  };

  const stopBot = async (botId: string) => {
    try {
      console.log('🛑 Stopping server bot:', botId);
      await BotAPI.stopBot(botId);
      
      // Remove from local state immediately
      setBots(prevBots => prevBots.filter(bot => bot.id !== botId));
      
      console.log('✅ Bot stopped on server');
      
    } catch (error) {
      console.error('❌ Failed to stop server bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop bot');
    }
  };

  const value: BotContextType = {
    strategies,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    getStrategy,
    bots,
    deployBot,
    pauseBot,
    resumeBot,
    stopBot,
    refreshBots,
    loading,
    error,
  };

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
};
