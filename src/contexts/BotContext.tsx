import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { StrategyConfig, BotInstance } from '../services/bot-engine/types';
import { BotEngine } from '../services/bot-engine/BotEngine';
import { SupabasePersistenceService } from '../services/supabase/SupabasePersistenceService';
import { useWallet } from './WalletContext';

interface BotContextType {
  // Strategies
  strategies: StrategyConfig[];
  addStrategy: (strategy: StrategyConfig) => void;
  updateStrategy: (id: string, strategy: Partial<StrategyConfig>) => void;
  deleteStrategy: (id: string) => void;
  getStrategy: (id: string) => StrategyConfig | undefined;

  // Bots
  bots: BotInstance[];
  deployBot: (strategyId: string) => Promise<void>;
  pauseBot: (botId: string) => void;
  resumeBot: (botId: string) => void;
  stopBot: (botId: string) => void;
  getBot: (botId: string) => BotInstance | undefined;

  // Loading & Error states
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
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  
  // Bot Engine instance
  const botEngineRef = useRef<BotEngine | null>(null);
  
  // Get wallet context for live trading and user ID
  const { exchangeClient, isConnected, address } = useWallet();
  

  // Load user data from Supabase only - no fallbacks
  const loadUserData = async () => {
    console.log('📂 Loading user data from Supabase...');
    try {
      // Always use Supabase - no KV or localStorage fallbacks
      const [loadedStrategies, loadedBots] = await Promise.all([
        SupabasePersistenceService.loadStrategies(),
        SupabasePersistenceService.loadBots()
      ]);
      
      console.log('📋 Loaded', loadedStrategies.length, 'strategies from Supabase');
      console.log('🤖 Loaded', loadedBots.length, 'bots from Supabase');
      
      setStrategies(loadedStrategies);
      
      // Restore bots to engine
      if (botEngineRef.current && loadedBots.length > 0) {
        console.log('🔄 Restoring', loadedBots.length, 'saved bots to engine from Supabase...');
        
        for (const bot of loadedBots) {
          const strategy = loadedStrategies.find((s: StrategyConfig) => s.id === bot.strategyId);
          if (strategy) {
            try {
              await botEngineRef.current.deployBot(strategy);
              console.log('✅ Restored bot:', bot.name);
            } catch (err) {
              console.error('❌ Failed to restore bot:', bot.name, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load user data from Supabase:', error);
      setError('Failed to load data. Please ensure you are logged in and the database is set up correctly.');
    }
  };

  // Initialize Bot Engine and Supabase connection
  useEffect(() => {
    const initializeBotEngine = async () => {
      try {
        console.log('🤖 Initializing Bot Engine and Supabase connection...');
        
        // Test Supabase connection (required)
        const supabaseTest = await SupabasePersistenceService.testConnection();
        setSupabaseConnected(supabaseTest);
        
        if (supabaseTest) {
          console.log('✅ Supabase connected successfully');
        } else {
          console.error('❌ Supabase connection failed - bot persistence will not work');
          setError('Database connection failed. Please check your internet connection and try again.');
        }
        
        botEngineRef.current = new BotEngine(false); // false = mainnet
        await botEngineRef.current.initialize();
        
        // Start the engine
        botEngineRef.current.start();
        console.log('✅ Bot Engine initialized and started');

        // Load strategies and bots from KV or localStorage
        await loadUserData();
        
      } catch (err) {
        console.error('❌ Failed to initialize Bot Engine:', err);
        setError('Failed to initialize bot engine');
      }
    };

    initializeBotEngine();

    // Cleanup on unmount
    return () => {
      if (botEngineRef.current) {
        botEngineRef.current.stop();
        console.log('🛑 Bot Engine stopped');
      }
    };
  }, []);

  // Save strategies when they change (Supabase only)
  useEffect(() => {
    if (strategies.length > 0 && supabaseConnected) {
      SupabasePersistenceService.saveStrategies(strategies).catch(console.error);
    }
  }, [strategies, supabaseConnected]);

  // Save deployed bots when they change
  // NOTE: Disabled automatic saving via useEffect to prevent race conditions
  // All saves now happen directly in the action functions (deployBot, pauseBot, etc.)
  // useEffect(() => {
  //   if (userId && bots.length >= 0) {
  //     console.log('💾 Saving', bots.length, 'bots to localStorage for userId:', userId);
  //     if (kvConnected) {
  //       BotPersistenceService.saveBots(userId, bots).catch(console.error);
  //     } else {
  //       localStorage.setItem(`${userId}:bots`, JSON.stringify(bots));
  //       console.log('✅ Saved to localStorage key:', `${userId}:bots`, 'Data:', bots);
  //     }
  //   }
  // }, [bots, userId, kvConnected]);

  // Connect wallet to bot engine for live trading
  useEffect(() => {
    if (botEngineRef.current && exchangeClient && isConnected) {
      botEngineRef.current.setExchangeClient(exchangeClient);
      console.log('🔗 Wallet connected to bot engine for live trading');
    }
  }, [exchangeClient, isConnected]);

  // Sync bot states from engine periodically
  useEffect(() => {
    if (!botEngineRef.current) return;

    let interval: NodeJS.Timeout;

    const syncBots = async () => {
      if (botEngineRef.current) {
        const engineBots = botEngineRef.current.getBots();
        console.log('🔄 Syncing bots from engine:', engineBots.length, 'bots');
        if (engineBots.length > 0) {
          console.log('Bot details:', engineBots.map(b => ({ id: b.id, name: b.name, status: b.status })));
        }
        setBots(engineBots);
        
        // Save to Supabase on every sync
        if (supabaseConnected && engineBots.length >= 0) {
          try {
            await SupabasePersistenceService.saveBots(engineBots);
            console.log('💾 Synced', engineBots.length, 'bots to Supabase');
          } catch (error) {
            console.error('❌ Failed to sync bots to Supabase:', error);
          }
        }
      }
    };

    // Wait a bit for engine to be fully initialized and bots restored
    const initialDelay = setTimeout(() => {
      syncBots();
      
      // Then sync every 5 seconds
      interval = setInterval(syncBots, 5000);
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [supabaseConnected]); // Added supabaseConnected as dependency

  const addStrategy = async (strategy: StrategyConfig) => {
    setStrategies([...strategies, strategy]);
    
    if (supabaseConnected) {
      try {
        await SupabasePersistenceService.addStrategy(strategy);
      } catch (error) {
        console.error('Failed to save strategy to Supabase:', error);
        setError('Failed to save strategy. Please try again.');
      }
    } else {
      setError('Database not connected. Cannot save strategy.');
    }
  };

  const updateStrategy = async (id: string, updates: Partial<StrategyConfig>) => {
    const updatedStrategies = strategies.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    setStrategies(updatedStrategies);
    
    if (supabaseConnected) {
      try {
        await SupabasePersistenceService.updateStrategy(id, updates);
      } catch (error) {
        console.error('Failed to update strategy in Supabase:', error);
        setError('Failed to update strategy. Please try again.');
      }
    } else {
      setError('Database not connected. Cannot update strategy.');
    }
  };

  const deleteStrategy = async (id: string) => {
    setStrategies(strategies.filter(s => s.id !== id));
    
    if (supabaseConnected) {
      try {
        await SupabasePersistenceService.deleteStrategy(id);
      } catch (error) {
        console.error('Failed to delete strategy from Supabase:', error);
        setError('Failed to delete strategy. Please try again.');
      }
    } else {
      setError('Database not connected. Cannot delete strategy.');
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

    if (!botEngineRef.current) {
      setError('Bot engine not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Deploying bot with strategy:', strategy.name);
      
      // Deploy bot using the real BotEngine
      const deployedBot = await botEngineRef.current.deployBot(strategy);
      
      console.log('✅ Bot deployed successfully:', deployedBot.name);
      console.log('⏳ Bot will be persisted to Supabase on next sync (within 5s)');
      
      // No need to manually update state or save - the sync will handle it
      // Just trigger a manual sync immediately for better UX
      if (botEngineRef.current) {
        const engineBots = botEngineRef.current.getBots();
        setBots(engineBots);
        
        if (supabaseConnected) {
          await SupabasePersistenceService.saveBots(engineBots);
          console.log('💾 Immediately saved', engineBots.length, 'bots to Supabase');
        }
      }
    } catch (err) {
      console.error('❌ Failed to deploy bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy bot');
    } finally {
      setLoading(false);
    }
  };

  const pauseBot = (botId: string) => {
    if (botEngineRef.current) {
      botEngineRef.current.pauseBot(botId);
      console.log('⏸️ Bot paused, will sync to Supabase within 5s');
    }
  };

  const resumeBot = (botId: string) => {
    if (botEngineRef.current) {
      botEngineRef.current.resumeBot(botId);
      console.log('▶️ Bot resumed, will sync to Supabase within 5s');
    }
  };

  const stopBot = (botId: string) => {
    if (botEngineRef.current) {
      botEngineRef.current.stopBot(botId);
      console.log('🛑 Bot stopped, will sync to Supabase within 5s');
    }
  };

  const getBot = (botId: string) => {
    return bots.find(b => b.id === botId);
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
    getBot,
    loading,
    error,
  };

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
};

