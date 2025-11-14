import { useState, useEffect, useCallback, useRef } from 'react';
import * as hl from '@nktkas/hyperliquid';
import { ScannerToken, ScannerTab } from '../types/scanner';
import { calculateLevels, findClosestLevel } from '../services/scanner/levelsCalculator';
import { LiquidityData, LevelsData, Trade, Level } from '../types/scanner';
import { hyperliquidService } from '../services/hyperliquid';

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

  // For levels tab: fetch levels from Python backend API
  useEffect(() => {
    if (!isLive || activeTab !== 'levels') return;
    
    console.log('🔍 Starting levels fetch from Python backend');

    const fetchLevels = async () => {
      const symbols = tokenSymbolsRef.current;
      if (symbols.length === 0) return;
      
      // Only process top 10 tokens for levels (already filtered in fetchTokenList)
      const tokensToProcess = symbols.slice(0, TOP_TOKENS_FOR_LEVELS);
      
      // Get Python API URL from environment or use default
      const SCANNER_API_URL = process.env.REACT_APP_SCANNER_API_URL || 'https://scanner-api.onrender.com';

      // Fetch levels from Python backend API for each token
      for (let i = 0; i < tokensToProcess.length; i++) {
        const symbol = tokensToProcess[i];
        const token = tokens.find((t) => t.symbol === symbol);
        if (!token) continue;
        
        // Add delay between requests to avoid overwhelming the API
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
        }

        try {
          const cacheKey = `${symbol}-levels`;
          const cached = candleCache.get(cacheKey);
          const now = Date.now();

          // Check cache first
          if (cached && now - cached.timestamp < CANDLE_CACHE_TTL) {
            // Use cached levels data
            if (cached.levelsData) {
              updateTokenData(symbol, { levels: cached.levelsData });
              continue;
            }
          }

          // Fetch levels from Python backend
          console.log(`📊 Fetching levels for ${symbol} from Python API...`);
          const response = await fetch(`${SCANNER_API_URL}/api/scanner/levels`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              coin: symbol,
              currentPrice: token.price,
              timeframes: ['15m', '30m', '1h'],
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (data.success && data.allLevelsByTimeframe) {
            // Convert Python API response to frontend format
            const closestLevel = data.closestLevel ? {
              price: data.closestLevel.price,
              timeframe: data.closestLevel.timeframe,
              type: data.closestLevel.type,
              distance: data.closestLevel.distance,
            } : null;

            const levelsData: LevelsData = {
              closestLevel,
              support: data.support ? {
                price: data.support.price,
                timeframe: data.support.timeframe,
                type: 'support',
                touches: 1,
                weight: data.support.weight,
              } : null,
              resistance: data.resistance ? {
                price: data.resistance.price,
                timeframe: data.resistance.timeframe,
                type: 'resistance',
                touches: 1,
                weight: data.resistance.weight,
              } : null,
              priceSpread: 0,
              markPrice: token.price,
            };

            // Cache the result
            candleCache.set(cacheKey, { 
              levelsData, 
              timestamp: now 
            });
            
            updateTokenData(symbol, { levels: levelsData });
            console.log(`✅ ${symbol}: Levels calculated - Support=${data.support?.price || 'N/A'}, Resistance=${data.resistance?.price || 'N/A'}`);
          } else {
            console.warn(`⚠️ ${symbol}: No levels data in API response`);
          }
          
        } catch (err) {
          console.error(`❌ Error fetching levels for ${symbol}:`, err);
          // Use cached data if available
          const cached = candleCache.get(`${symbol}-levels`);
          if (cached && cached.levelsData) {
            updateTokenData(symbol, { levels: cached.levelsData });
          }
        }
      }

      setLastUpdate(new Date());
    };

    // Fetch levels initially and then every 5 minutes (candles don't change until candle closes)
    // Using Python backend API for reliable candle fetching
    fetchLevels();
    const interval = setInterval(fetchLevels, 300_000); // 5 minutes - candles are historical data

    return () => clearInterval(interval);
  }, [isLive, activeTab, tokens, updateTokenData]);

  return {
    tokens,
    loading,
    error,
    lastUpdate,
  };
}

