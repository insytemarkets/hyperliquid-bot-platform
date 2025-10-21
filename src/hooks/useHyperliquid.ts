import { useState, useEffect, useCallback } from 'react';
import { hyperliquidService, AllMids, MarketData, UserState, L2Book } from '../services/hyperliquid';

// Hook for all market prices - reduced refresh rate to prevent constant rotation
export const useAllMids = () => {
  const [data, setData] = useState<AllMids | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await hyperliquidService.getAllMids();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Subscribe to WebSocket for live updates
    const unsubscribe = hyperliquidService.subscribeToAllMids((newData) => {
      console.log('📡 Live price update received via WebSocket');
      setData(newData);
      setError(null);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Hook for market overview data
export const useMarketOverview = (refreshInterval: number = 10000) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await hyperliquidService.getMarketOverviewData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
};

// Hook for L2 order book
export const useL2Book = (coin: string, refreshInterval: number = 1000) => {
  const [data, setData] = useState<L2Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!coin) return;
    
    try {
      setError(null);
      const result = await hyperliquidService.getL2Book(coin);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch L2 book for ${coin}`);
    } finally {
      setLoading(false);
    }
  }, [coin]);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
};

// Hook for user account state
export const useUserState = (userAddress: string | null, refreshInterval: number = 5000) => {
  const [data, setData] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userAddress) {
      setData(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const result = await hyperliquidService.getUserState(userAddress);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user state');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchData();
    
    if (userAddress) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, userAddress, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
};

// Hook for real-time price updates
export const useRealTimePrices = (coins: string[]) => {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (coins.length === 0) return;

    const unsubscribe = hyperliquidService.subscribeToAllMids((data) => {
      setLoading(false);
      setError(null);
      
      // Filter prices for requested coins
      const filteredPrices: Record<string, string> = {};
      coins.forEach(coin => {
        if (data[coin]) {
          filteredPrices[coin] = data[coin];
        }
      });
      
      setPrices(filteredPrices);
    });

    return unsubscribe;
  }, [coins]);

  return { prices, loading, error };
};

// Hook for market statistics with real data
export const useMarketStats = () => {
  const { data: marketOverview, loading: marketLoading } = useMarketOverview();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalVolume: '$0',
    avgChange: 0,
    gainers: 0,
    losers: 0,
  });

  useEffect(() => {
    if (marketOverview && marketOverview.topAssets) {
      const assets = marketOverview.topAssets;
      const totalAssets = assets.length;
      
      // Calculate real stats from Hyperliquid data
      let totalChange = 0;
      let gainersCount = 0;
      let losersCount = 0;
      
      assets.forEach((asset: any) => {
        totalChange += asset.change24h;
        if (asset.change24h > 0) gainersCount++;
        else if (asset.change24h < 0) losersCount++;
      });
      
      const avgChange = totalChange / totalAssets;
      
      const calculatedStats = {
        totalAssets,
        totalVolume: hyperliquidService.formatVolume(marketOverview.totalVolume),
        avgChange: Number(avgChange.toFixed(1)),
        gainers: gainersCount,
        losers: losersCount,
      };
      
      setStats(calculatedStats);
    }
  }, [marketOverview]);

  return { stats, loading: marketLoading };
};

// Hook for top movers with real Hyperliquid data
export const useTopMovers = (limit: number = 10) => {
  const { data: marketOverview } = useMarketOverview();
  const [topMovers, setTopMovers] = useState<Array<{
    coin: string;
    price: string;
    change24h: number;
    volume: string;
    isGainer: boolean;
  }>>([]);

  useEffect(() => {
    if (marketOverview && marketOverview.topAssets) {
      // Use real data from Hyperliquid API
      const movers = marketOverview.topAssets
        .slice(0, limit)
        .map((asset: any) => ({
          coin: asset.coin,
          price: asset.price,
          change24h: asset.change24h,
          volume: asset.volume,
          isGainer: asset.change24h > 0,
        }))
        .sort((a: any, b: any) => Math.abs(b.change24h) - Math.abs(a.change24h));

      setTopMovers(movers);
    }
  }, [marketOverview, limit]);

  return { topMovers };
};

// Helper functions for realistic data generation
const getVolumeMultiplier = (coin: string): number => {
  const volumeMap: Record<string, number> = {
    'BTC': 10.0, 'ETH': 8.0, 'SOL': 6.0, 'AVAX': 3.0, 'MATIC': 2.5,
    'LINK': 2.0, 'UNI': 1.8, 'AAVE': 1.5, 'DOT': 1.3, 'ADA': 1.2,
  };
  return volumeMap[coin] || 1.0;
};

// Stable 24hr changes that don't constantly rotate - based on coin hash for consistency
const generateStable24hChange = (coin: string): number => {
  // Create a stable seed based on coin name and current day
  const today = new Date().toDateString();
  const seed = hashString(coin + today);
  
  const volatilityMap: Record<string, number> = {
    'BTC': 3.0, 'ETH': 4.0, 'SOL': 6.0, 'AVAX': 5.5, 'MATIC': 5.0,
    'LINK': 4.5, 'UNI': 5.5, 'AAVE': 5.0, 'DOT': 4.0, 'ADA': 4.5,
  };
  
  const maxChange = volatilityMap[coin] || 4.0;
  const random = seededRandom(seed);
  return (random - 0.45) * maxChange * 2; // Slight positive bias
};

// Simple hash function for consistent seeding
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Seeded random number generator for consistent results
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Hook for asset metadata
export const useAssetMeta = () => {
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const result = await hyperliquidService.getMeta();
        setMeta(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch asset metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();
  }, []);

  return { meta, loading, error };
};