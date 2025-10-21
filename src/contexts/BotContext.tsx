import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { StrategyConfig, BotInstance } from '../services/bot-engine/types';
import { BotEngine } from '../services/bot-engine/BotEngine';
import { KVService } from '../services/kv/KVService';
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
  
  // Bot Engine instance
  const botEngineRef = useRef<BotEngine | null>(null);
  
  // Get wallet context for live trading
  const { exchangeClient, isConnected } = useWallet();

  // Initialize Bot Engine
  useEffect(() => {
    const initializeBotEngine = async () => {
      try {
        console.log('🤖 Initializing Bot Engine...');
        botEngineRef.current = new BotEngine(false); // false = mainnet
        await botEngineRef.current.initialize();
        
        // Start the engine
        botEngineRef.current.start();
        console.log('✅ Bot Engine initialized and started');

        // Restore previously deployed bots from KV
        try {
          const savedBots = await KVService.loadBots();
          if (savedBots.length > 0) {
            console.log('🔄 Restoring', savedBots.length, 'saved bots from KV to engine...');
            
            for (const bot of savedBots) {
              // Find the strategy for this bot
              const strategy = await KVService.loadStrategy(bot.strategyId);
              if (strategy) {
                try {
                  await botEngineRef.current.deployBot(strategy);
                  console.log('✅ Restored bot from KV:', bot.name);
                } catch (err) {
                  console.error('❌ Failed to restore bot:', bot.name, err);
                }
              }
            }
          }
        } catch (e) {
          console.error('Failed to restore bots from KV:', e);
          // Fallback to localStorage
          const savedBots = localStorage.getItem('deployed_bots');
          if (savedBots) {
            try {
              const parsedBots = JSON.parse(savedBots);
              console.log('🔄 Fallback: Restoring', parsedBots.length, 'saved bots from localStorage...');
              
              for (const bot of parsedBots) {
                const savedStrategies = localStorage.getItem('bot_strategies');
                if (savedStrategies) {
                  const strategies = JSON.parse(savedStrategies);
                  const strategy = strategies.find((s: StrategyConfig) => s.id === bot.strategyId);
                  if (strategy) {
                    try {
                      await botEngineRef.current.deployBot(strategy);
                      console.log('✅ Restored bot from localStorage:', bot.name);
                    } catch (err) {
                      console.error('❌ Failed to restore bot:', bot.name, err);
                    }
                  }
                }
              }
            } catch (parseError) {
              console.error('Failed to restore bots from localStorage:', parseError);
            }
          }
        }
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

  // Load strategies from KV on mount
  useEffect(() => {
    const loadStrategiesFromKV = async () => {
      try {
        const savedStrategies = await KVService.loadStrategies();
        if (savedStrategies.length > 0) {
          setStrategies(savedStrategies);
          console.log('📦 Loaded strategies from KV:', savedStrategies.length);
        }
      } catch (e) {
        console.error('Failed to load strategies from KV:', e);
        // Fallback to localStorage
        const fallback = localStorage.getItem('bot_strategies');
        if (fallback) {
          try {
            setStrategies(JSON.parse(fallback));
            console.log('📂 Fallback: Loaded strategies from localStorage');
          } catch (parseError) {
            console.error('Failed to parse fallback strategies:', parseError);
          }
        }
      }
    };
    
    loadStrategiesFromKV();
  }, []);

  // Load deployed bots from KV on mount
  useEffect(() => {
    const loadBotsFromKV = async () => {
      try {
        const savedBots = await KVService.loadBots();
        if (savedBots.length > 0) {
          setBots(savedBots);
          console.log('📦 Loaded bots from KV:', savedBots.length);
        }
      } catch (e) {
        console.error('Failed to load bots from KV:', e);
        // Fallback to localStorage
        const fallback = localStorage.getItem('deployed_bots');
        if (fallback) {
          try {
            const parsedBots = JSON.parse(fallback);
            setBots(parsedBots);
            console.log('📂 Fallback: Loaded bots from localStorage:', parsedBots.length);
          } catch (parseError) {
            console.error('Failed to parse fallback bots:', parseError);
          }
        }
      }
    };
    
    loadBotsFromKV();
  }, []);

  // Save strategies to KV when they change
  useEffect(() => {
    if (strategies.length > 0) {
      KVService.saveStrategies(strategies).catch(error => {
        console.error('Failed to save strategies to KV:', error);
        // Fallback to localStorage
        localStorage.setItem('bot_strategies', JSON.stringify(strategies));
      });
    }
  }, [strategies]);

  // Save deployed bots to KV when they change
  useEffect(() => {
    if (bots.length > 0) {
      KVService.saveBots(bots).catch(error => {
        console.error('Failed to save bots to KV:', error);
        // Fallback to localStorage
        localStorage.setItem('deployed_bots', JSON.stringify(bots));
      });
    }
  }, [bots]);

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

    const syncBots = () => {
      if (botEngineRef.current) {
        const engineBots = botEngineRef.current.getBots();
        console.log('🔄 Syncing bots from engine:', engineBots.length);
        setBots(engineBots);
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
  }, []); // Empty dependency array since we want this to run once after engine initialization

  const addStrategy = (strategy: StrategyConfig) => {
    setStrategies([...strategies, strategy]);
  };

  const updateStrategy = (id: string, updates: Partial<StrategyConfig>) => {
    setStrategies(strategies.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    ));
  };

  const deleteStrategy = (id: string) => {
    setStrategies(strategies.filter(s => s.id !== id));
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
      
      // Update local state
      setBots(prevBots => {
        const newBots = [...prevBots, deployedBot];
        console.log('💾 Updating bot list, total bots:', newBots.length);
        return newBots;
      });
      
      console.log('✅ Bot deployed successfully:', deployedBot.name);
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
    }
    setBots(bots.map(b => 
      b.id === botId ? { ...b, status: 'paused' as const } : b
    ));
  };

  const resumeBot = (botId: string) => {
    if (botEngineRef.current) {
      botEngineRef.current.resumeBot(botId);
    }
    setBots(bots.map(b => 
      b.id === botId ? { ...b, status: 'running' as const } : b
    ));
  };

  const stopBot = (botId: string) => {
    if (botEngineRef.current) {
      botEngineRef.current.stopBot(botId);
    }
    // Remove stopped bot from the list
    setBots(bots.filter(b => b.id !== botId));
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

