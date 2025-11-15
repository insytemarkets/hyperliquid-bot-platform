import { useState, useEffect, useCallback, useRef } from 'react';
import * as hl from '@nktkas/hyperliquid';
import { ScannerToken, ScannerTab } from '../types/scanner';
import { calculateLevels, findClosestLevel } from '../services/scanner/levelsCalculator';
import { LiquidityData, LevelsData, Trade, Level } from '../types/scanner';
import { hyperliquidService } from '../services/hyperliquid';
import { supabase } from '../services/supabase/supabaseClient';

const MIN_VOLUME = 50_000_000; // $50M
const MAX_DECLINE_THRESHOLD = -10; // -10%
const TOP_TOKENS_COUNT = 15; // Keep at 15 for liquidity scanner
const TOP_TOKENS_FOR_LEVELS = 10; // Reduced to 10 for levels scanner only

// Cache for token list (refresh every 30 seconds)
let tokenListCache: { tokens: any[]; timestamp: number } | null = null;
const TOKEN_LIST_CACHE_TTL = 30_000; // 30 seconds

// Cache for candles/levels (refresh every 5 minutes - candles only update when they close)
const candleCache: Map<string, { candles?: any; levelsData?: any; timestamp: number }> = new Map();
const CANDLE_CACHE_TTL = 300_000; // 5 minutes - candles are historical data

// Track failed fetches to prevent spam
const failedFetches: Map<string, number> = new Map();
const FAILED_FETCH_COOLDOWN = 60_000; // Don't retry failed fetches for 1 minute

// Circuit breaker: Stop fetching if too many errors (LEVELS ONLY)
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;
let circuitBreakerOpen = false;
const CIRCUIT_BREAKER_RESET_TIME = 60_000; // 1 minute

export function useScanner(activeTab: ScannerTab, isLive: boolean) {
  const [tokens, setTokens] = useState<ScannerToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const wsTransportRef = useRef<hl.WebSocketTransport | null>(null);
  const infoClientRef = useRef<hl.InfoClient | null>(null);
  const subsClientRef = useRef<hl.SubscriptionClient | null>(null);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const tokenSymbolsRef = useRef<string[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        const transport = new hl.WebSocketTransport({
          isTestnet: false,
          reconnect: {
            maxRetries: 10,
            connectionTimeout: 10000,
          },
        });

        await transport.ready();
        wsTransportRef.current = transport;
        infoClientRef.current = new hl.InfoClient({ transport });
        subsClientRef.current = new hl.SubscriptionClient({ transport });

        console.log('✅ Scanner WebSocket connected');
      } catch (err) {
        console.error('❌ Failed to connect WebSocket:', err);
        setError('Failed to connect to WebSocket');
      }
    };

    initWebSocket();

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current.clear();

      // Close WebSocket
      if (wsTransportRef.current) {
        wsTransportRef.current.close();
      }
    };
  }, []);

  // Fetch initial token list (cached)
  const fetchTokenList = useCallback(async (limit: number = TOP_TOKENS_COUNT) => {
    const now = Date.now();
    if (tokenListCache && now - tokenListCache.timestamp < TOKEN_LIST_CACHE_TTL) {
      // Return cached tokens, but slice to requested limit
      return tokenListCache.tokens.slice(0, limit);
    }

    try {
      const infoClient = infoClientRef.current;
      if (!infoClient) return [];

      const response = await infoClient.metaAndAssetCtxs();
      if (!response || !response[1]) return [];

      const tokenList: any[] = [];
      response[1].forEach((assetCtx: any, index: number) => {
        const coin = response[0].universe[index]?.name;
        if (!coin) return;

        const dayNtlVlm = parseFloat(assetCtx.dayNtlVlm || '0');
        const prevDayPx = parseFloat(assetCtx.prevDayPx || '0');
        const markPx = parseFloat(assetCtx.markPx || '0');

        if (dayNtlVlm >= MIN_VOLUME && prevDayPx > 0 && markPx > 0) {
          const change24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;
          if (change24h > MAX_DECLINE_THRESHOLD) {
            tokenList.push({
              coin,
              volume: dayNtlVlm,
              price: markPx,
              change24h,
              prevDayPx,
              markPx,
            });
          }
        }
      });

      const topTokens = tokenList
        .sort((a, b) => b.volume - a.volume)
        .slice(0, TOP_TOKENS_COUNT); // Cache full list

      tokenListCache = { tokens: topTokens, timestamp: now };
      return topTokens.slice(0, limit); // Return requested limit
    } catch (err) {
      console.error('Error fetching token list:', err);
      return tokenListCache?.tokens.slice(0, limit) || [];
    }
  }, []);

  // Analyze liquidity from trades
  const analyzeLiquidityFromTrades = useCallback((trades: Trade[]): LiquidityData | null => {
    if (!trades || trades.length === 0) return null;

    let buyVolume = 0;
    let sellVolume = 0;
    let buyCount = 0;
    let sellCount = 0;

    trades.forEach((trade) => {
      const price = typeof trade.px === 'string' ? parseFloat(trade.px) : trade.px;
      const size = typeof trade.sz === 'string' ? parseFloat(trade.sz) : trade.sz;
      const volume = price * size;

      if (trade.side === 'B') {
        buyVolume += volume;
        buyCount++;
      } else {
        sellVolume += volume;
        sellCount++;
      }
    });

    const totalVolume = buyVolume + sellVolume;
    const netFlow = buyVolume - sellVolume;
    const flowRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;
    const avgBuySize = buyCount > 0 ? buyVolume / buyCount : 0;
    const avgSellSize = sellCount > 0 ? sellVolume / sellCount : 0;
    const priceImpact = totalVolume > 0 ? (netFlow / totalVolume) * 100 : 0;

    const absNetFlow = Math.abs(netFlow);
    let intensity: 'extreme' | 'high' | 'medium' | 'low';
    if (absNetFlow > 5_000_000) {
      intensity = 'extreme';
    } else if (absNetFlow > 2_000_000) {
      intensity = 'high';
    } else if (absNetFlow > 500_000) {
      intensity = 'medium';
    } else {
      intensity = 'low';
    }

    const flowDirection: 'bullish' | 'bearish' | 'neutral' =
      priceImpact > 0.05 ? 'bullish' : priceImpact < -0.05 ? 'bearish' : 'neutral';

    return {
      netFlow,
      buyVolume,
      sellVolume,
      buyCount,
      sellCount,
      flowRatio,
      avgBuySize,
      avgSellSize,
      intensity,
      priceImpact,
      flowDirection,
    };
  }, []);

  // Update token data in place
  const updateTokenData = useCallback(
    (symbol: string, updates: Partial<ScannerToken>) => {
      setTokens((prev) =>
        prev.map((token) => (token.symbol === symbol ? { ...token, ...updates } : token))
      );
    },
    []
  );

  // Initialize tokens and set up WebSocket subscriptions
  useEffect(() => {
    if (!isLive || !infoClientRef.current || !subsClientRef.current) return;

    const initializeTokens = async () => {
      try {
        setLoading(true);
        // Use full list for liquidity, limited for levels
        const limit = activeTab === 'levels' ? TOP_TOKENS_FOR_LEVELS : TOP_TOKENS_COUNT;
        const tokenList = await fetchTokenList(limit);
        tokenSymbolsRef.current = tokenList.map((t) => t.coin);

        // Initialize token state
        const initialTokens: ScannerToken[] = tokenList.map((t) => ({
          symbol: t.coin,
          price: t.price,
          volume: t.volume,
          change24h: t.change24h,
        }));

        setTokens(initialTokens);

        // Set up WebSocket subscriptions for prices
        const subsClient = subsClientRef.current!;
        const infoClient = infoClientRef.current!;

        // Subscribe to all mids for price updates
        await subsClient.allMids((data: any) => {
          if (data && typeof data === 'object') {
            Object.entries(data).forEach(([coin, price]) => {
              if (tokenSymbolsRef.current.includes(coin)) {
                const priceNum =
                  typeof price === 'string'
                    ? parseFloat(price)
                    : typeof price === 'number'
                    ? price
                    : 0;
                if (priceNum > 0) {
                  updateTokenData(coin, { price: priceNum });
                }
              }
            });
            setLastUpdate(new Date());
          }
        });

        // For liquidity tab: subscribe to trades with delay to prevent rate limits
        if (activeTab === 'liquidity') {
          const tradeBuffers = new Map<string, Trade[]>();

          tokenSymbolsRef.current.forEach((coin, index) => {
            // Stagger subscriptions to avoid rate limits
            setTimeout(async () => {
              try {
                const subscription = await subsClient.trades({ coin }, (data: any) => {
                  // Handle both array and object formats
                  let trades: any[] = [];
                  if (Array.isArray(data)) {
                    trades = data;
                  } else if (data && typeof data === 'object') {
                    // Could be wrapped in an object
                    trades = Array.isArray(data.trades) ? data.trades : [data];
                  }

                  if (trades.length > 0) {
                    const formattedTrades: Trade[] = trades.map((t: any) => ({
                      time: t.time || Date.now(),
                      coin: t.coin || coin,
                      side: t.side || 'B',
                      px: typeof t.px === 'string' ? t.px : String(t.px || '0'),
                      sz: typeof t.sz === 'string' ? t.sz : String(t.sz || '0'),
                      hash: t.hash,
                    }));

                    // Keep last 100 trades per coin
                    const buffer = tradeBuffers.get(coin) || [];
                    const updated = [...formattedTrades, ...buffer].slice(0, 100);
                    tradeBuffers.set(coin, updated);

                    // Analyze liquidity
                    const liquidity = analyzeLiquidityFromTrades(updated);
                    if (liquidity) {
                      updateTokenData(coin, { liquidity });
                    }
                  }
                });

                // Store unsubscribe function
                if (subscription && typeof subscription.unsubscribe === 'function') {
                  subscriptionsRef.current.set(`trades-${coin}`, () => subscription.unsubscribe());
                }
              } catch (err) {
                console.error(`Error subscribing to trades for ${coin}:`, err);
              }
            }, index * 100); // 100ms delay between each subscription
          });
        }

        setLoading(false);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error initializing tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    initializeTokens();

    return () => {
      // Cleanup subscriptions when tab changes or live mode off
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current.clear();
    };
  }, [isLive, activeTab, fetchTokenList, analyzeLiquidityFromTrades, updateTokenData]);

  // For levels tab: fetch levels from Supabase (written by Python worker)
  useEffect(() => {
    if (!isLive || activeTab !== 'levels') return;

    const fetchLevels = async () => {
      const symbols = tokenSymbolsRef.current;
      if (symbols.length === 0) return;
      
      // Only process top 10 tokens for levels (already filtered in fetchTokenList)
      const tokensToProcess = symbols.slice(0, TOP_TOKENS_FOR_LEVELS);

      try {
        // Fetch all scanner levels from Supabase
        const { data: levelsData, error } = await supabase
          .from('scanner_levels')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching levels from Supabase:', error);
          return;
        }

        if (!levelsData || levelsData.length === 0) {
          // Only log warning once, not every fetch
          return;
        }

        // Update tokens with levels data
        for (const levelRow of levelsData) {
          const symbol = levelRow.symbol;
          const token = tokens.find((t) => t.symbol === symbol);
          if (!token) continue;

          // Convert Supabase format to frontend format
          const levelsDataFormatted: LevelsData = {
            closestLevel: levelRow.closest_level ? {
              price: levelRow.closest_level.price,
              timeframe: levelRow.closest_level.timeframe,
              type: levelRow.closest_level.type,
              distance: levelRow.closest_level.distance,
            } : null,
            support: levelRow.support ? {
              price: levelRow.support.price,
              timeframe: levelRow.support.timeframe,
              type: 'support',
              touches: levelRow.support.touches || 1,
              weight: levelRow.support.weight,
            } : null,
            resistance: levelRow.resistance ? {
              price: levelRow.resistance.price,
              timeframe: levelRow.resistance.timeframe,
              type: 'resistance',
              touches: levelRow.resistance.touches || 1,
              weight: levelRow.resistance.weight,
            } : null,
            priceSpread: 0, // Can be calculated if needed
            indexPrice: levelRow.current_price,
            markPrice: levelRow.current_price,
            allLevelsByTimeframe: levelRow.all_levels_by_timeframe || {},
          };

          updateTokenData(symbol, { levels: levelsDataFormatted });
        }

        setLastUpdate(new Date());
      } catch (err) {
        console.error('❌ Error fetching levels from Supabase:', err);
      }
    };

    // Fetch levels initially and then every 5 minutes (candles don't change until candle closes)
    fetchLevels();
    const interval = setInterval(fetchLevels, 300_000); // 5 minutes - candles are historical data

    // Real-time subscription for levels updates (like BotLogs.tsx)
    const channel = supabase
      .channel('scanner_levels_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scanner_levels',
        },
        (payload) => {
          const updatedLevel = payload.new as any;
          const symbol = updatedLevel.symbol;
          const token = tokens.find((t) => t.symbol === symbol);
          if (!token) return;

          // Convert Supabase format to frontend format
          const levelsDataFormatted: LevelsData = {
            closestLevel: updatedLevel.closest_level ? {
              price: updatedLevel.closest_level.price,
              timeframe: updatedLevel.closest_level.timeframe,
              type: updatedLevel.closest_level.type,
              distance: updatedLevel.closest_level.distance,
            } : null,
            support: updatedLevel.support ? {
              price: updatedLevel.support.price,
              timeframe: updatedLevel.support.timeframe,
              type: 'support',
              touches: updatedLevel.support.touches || 1,
              weight: updatedLevel.support.weight,
            } : null,
            resistance: updatedLevel.resistance ? {
              price: updatedLevel.resistance.price,
              timeframe: updatedLevel.resistance.timeframe,
              type: 'resistance',
              touches: updatedLevel.resistance.touches || 1,
              weight: updatedLevel.resistance.weight,
            } : null,
            priceSpread: 0,
            indexPrice: updatedLevel.current_price,
            markPrice: updatedLevel.current_price,
            allLevelsByTimeframe: updatedLevel.all_levels_by_timeframe || {},
          };

          updateTokenData(symbol, { levels: levelsDataFormatted });
          setLastUpdate(new Date());
          // Removed console.log for real-time updates - too spammy
        }
      )
      .subscribe((status) => {
        // Removed subscription status logs - not needed for normal operation
        // Only log errors if needed
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isLive, activeTab, tokens, updateTokenData]);

  return {
    tokens,
    loading,
    error,
    lastUpdate,
  };
}

