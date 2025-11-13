import { useState, useEffect, useCallback, useRef } from 'react';
import * as hl from '@nktkas/hyperliquid';
import { ScannerToken, ScannerTab } from '../types/scanner';
import { calculateLevels, findClosestLevel } from '../services/scanner/levelsCalculator';
import { LiquidityData, LevelsData, Trade } from '../types/scanner';

const MIN_VOLUME = 50_000_000; // $50M
const MAX_DECLINE_THRESHOLD = -10; // -10%
const TOP_TOKENS_COUNT = 15;

// Cache for token list (refresh every 30 seconds)
let tokenListCache: { tokens: any[]; timestamp: number } | null = null;
const TOKEN_LIST_CACHE_TTL = 30_000; // 30 seconds

// Cache for candles (refresh every 60 seconds)
const candleCache: Map<string, { candles: any; timestamp: number }> = new Map();
const CANDLE_CACHE_TTL = 60_000; // 60 seconds

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
  const fetchTokenList = useCallback(async () => {
    const now = Date.now();
    if (tokenListCache && now - tokenListCache.timestamp < TOKEN_LIST_CACHE_TTL) {
      return tokenListCache.tokens;
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
        .slice(0, TOP_TOKENS_COUNT);

      tokenListCache = { tokens: topTokens, timestamp: now };
      return topTokens;
    } catch (err) {
      console.error('Error fetching token list:', err);
      return tokenListCache?.tokens || [];
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
        const tokenList = await fetchTokenList();
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

  // For levels tab: fetch candles periodically (with caching)
  useEffect(() => {
    if (!isLive || activeTab !== 'levels' || !infoClientRef.current) return;

    const fetchLevels = async () => {
      const infoClient = infoClientRef.current!;
      const symbols = tokenSymbolsRef.current;

      // Fetch candles for each token (with caching and rate limiting)
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        
        // Add delay between tokens to prevent rate limits
        await new Promise((resolve) => setTimeout(resolve, i * 200)); // 200ms delay per token

        try {
          const cacheKey = `${symbol}-levels`;
          const cached = candleCache.get(cacheKey);
          const now = Date.now();

          let candlesByTimeframe: Record<string, any[]> = {};

          if (cached && now - cached.timestamp < CANDLE_CACHE_TTL) {
            candlesByTimeframe = cached.candles;
          } else {
            // Fetch candles for key timeframes only (reduce API calls)
            const timeframes: Array<'15m' | '30m' | '1h' | '4h' | '12h' | '1d'> = [
              '15m',
              '30m',
              '1h',
              '4h',
              '12h',
              '1d',
            ];

            const endTime = Date.now();
            
            // Fetch timeframes sequentially with delays to prevent rate limits
            for (let j = 0; j < timeframes.length; j++) {
              const tf = timeframes[j];
              
              // Delay between timeframe requests
              if (j > 0) {
                await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
              }

              try {
                const startTime =
                  endTime -
                  (tf === '15m' || tf === '30m' || tf === '1h'
                    ? 100 * (tf === '15m' ? 15 : tf === '30m' ? 30 : 60) * 60 * 1000
                    : 200 * (tf === '4h' ? 4 : tf === '12h' ? 12 : 24) * 60 * 60 * 1000);

                const candles = await infoClient.candleSnapshot({
                  coin: symbol,
                  interval: tf,
                  startTime,
                  endTime,
                });

                candlesByTimeframe[tf] = candles || [];
              } catch (err) {
                console.error(`Error fetching ${tf} candles for ${symbol}:`, err);
                candlesByTimeframe[tf] = [];
              }
            }

            candleCache.set(cacheKey, { candles: candlesByTimeframe, timestamp: now });
          }

          // Calculate levels
          const token = tokens.find((t) => t.symbol === symbol);
          if (!token) continue;

          const allLevelsByTimeframe: Record<string, { support: any; resistance: any }> = {};
          Object.entries(candlesByTimeframe).forEach(([tf, candles]) => {
            if (candles && candles.length > 0) {
              const levels = calculateLevels(candles, tf, token.price);
              allLevelsByTimeframe[tf] = {
                support: levels.support,
                resistance: levels.resistance,
              };
            }
          });

          const closestLevel = findClosestLevel(allLevelsByTimeframe, token.price);

          let strongestSupport: any = null;
          let strongestResistance: any = null;
          let maxSupportWeight = 0;
          let maxResistanceWeight = 0;

          Object.values(allLevelsByTimeframe).forEach((levels) => {
            if (levels.support && levels.support.weight > maxSupportWeight) {
              strongestSupport = levels.support;
              maxSupportWeight = levels.support.weight;
            }
            if (levels.resistance && levels.resistance.weight > maxResistanceWeight) {
              strongestResistance = levels.resistance;
              maxResistanceWeight = levels.resistance.weight;
            }
          });

          const levelsData: LevelsData = {
            closestLevel: closestLevel
              ? {
                  price: closestLevel.price,
                  timeframe: closestLevel.timeframe,
                  type: closestLevel.type,
                  distance: closestLevel.distance,
                }
              : null,
            support: strongestSupport,
            resistance: strongestResistance,
            priceSpread: 0,
            indexPrice: token.price,
            markPrice: token.price,
          };

          updateTokenData(symbol, { levels: levelsData });
        } catch (err) {
          console.error(`Error fetching levels for ${symbol}:`, err);
        }
      }

      setLastUpdate(new Date());
    };

    // Fetch levels initially and then every 30 seconds (cached)
    fetchLevels();
    const interval = setInterval(fetchLevels, 30_000);

    return () => clearInterval(interval);
  }, [isLive, activeTab, tokens, updateTokenData]);

  return {
    tokens,
    loading,
    error,
    lastUpdate,
  };
}

