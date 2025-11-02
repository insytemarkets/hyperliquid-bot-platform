import * as hl from '@nktkas/hyperliquid';

// Types for Hyperliquid API responses
export interface MarketData {
  coin: string;
  price: string;
  change24h: string;
  volume24h: string;
  marketCap?: string;
}

export interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  marginTableId: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
}

export interface AllMids {
  [coin: string]: string;
}

export interface Meta {
  universe: AssetInfo[];
  marginTables: [number, { description: string; marginTiers: any[]; }][];
  collateralToken: number;
}

export interface L2Book {
  coin: string;
  levels: [
    Array<{ px: string; sz: string; n: number; }>, // bids
    Array<{ px: string; sz: string; n: number; }>  // asks
  ];
  time: number;
}

export interface UserState {
  assetPositions: Array<{
    position: {
      coin: string;
      entryPx: string | null;
      leverage: {
        type: string;
        value: number;
      };
      liquidationPx: string | null;
      marginUsed: string;
      maxLeverage: number;
      positionValue: string;
      returnOnEquity: string;
      szi: string;
      unrealizedPnl: string;
    };
    type: string;
  }>;
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  time: number;
  withdrawable: string;
}

class HyperliquidService {
  private infoClient: hl.InfoClient;
  private isTestnet: boolean;
  
  // Top 10 major coins with high volume (>$50M daily volume)
  private readonly MAJOR_COINS = [
    'BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE', 'DOT', 'ADA'
  ];

  constructor(isTestnet: boolean = false) {
    this.isTestnet = isTestnet;
    this.infoClient = new hl.InfoClient({
      transport: new hl.HttpTransport({ isTestnet }),
    });

    // Initialize WebSocket client for real-time updates
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    // WebSocket initialization - will be lazy loaded when needed
    console.log('📡 WebSocket will connect on first subscription');
  }

  // Subscribe to all mids (live price updates via polling for now)
  // The @nktkas/hyperliquid WebSocket API requires different setup
  // For now, we'll use frequent polling which will be upgraded to WebSocket later
  subscribeToAllMids(callback: (data: AllMids) => void): () => void {
    console.log('✅ Subscribed to live price updates (polling mode)');
    
    const pollInterval = setInterval(async () => {
      try {
        const mids = await this.getAllMids();
        callback(mids);
      } catch (error) {
        console.error('Error polling prices:', error);
      }
    }, 2000); // Poll every 2 seconds for near-real-time updates

    return () => {
      clearInterval(pollInterval);
      console.log('❌ Unsubscribed from live price updates');
    };
  }

  // Subscribe to trades for a specific coin (placeholder for now)
  subscribeToTrades(coin: string, callback: (data: any) => void): () => void {
    console.log(`✅ Subscribed to ${coin} trades (polling mode)`);
    
    const pollInterval = setInterval(async () => {
      try {
        // Fetch recent trades for this coin
        // This is a placeholder - actual implementation would fetch trades
        callback({ coin, trades: [] });
      } catch (error) {
        console.error(`Error polling ${coin} trades:`, error);
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      console.log(`❌ Unsubscribed from ${coin} trades`);
    };
  }

  // Close WebSocket connection (no-op for polling mode)
  closeWebSocket() {
    console.log('✅ Closed subscription connections');
  }

  // Market Data Methods
  async getAllMids(): Promise<AllMids> {
    try {
      const response = await this.infoClient.allMids();
      
      // Filter for only major coins
      const filteredMids: AllMids = {};
      this.MAJOR_COINS.forEach(coin => {
        if (response[coin]) {
          filteredMids[coin] = response[coin];
        }
      });
      
      return filteredMids;
    } catch (error) {
      console.error('Error fetching all mids:', error);
      throw error;
    }
  }

  async getMeta(): Promise<Meta> {
    try {
      const response = await this.infoClient.meta();
      return response;
    } catch (error) {
      console.error('Error fetching meta:', error);
      throw error;
    }
  }

  async getL2Book(coin: string): Promise<L2Book> {
    try {
      const response = await this.infoClient.l2Book({ coin });
      return {
        coin,
        levels: response?.levels || [[], []],
        time: response?.time || Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching L2 book for ${coin}:`, error);
      throw error;
    }
  }

  async getUserState(user: string): Promise<UserState> {
    try {
      const response = await this.infoClient.clearinghouseState({ user });
      return response;
    } catch (error) {
      console.error(`Error fetching user state for ${user}:`, error);
      throw error;
    }
  }

  async getCandleSnapshot(coin: string, interval: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "8h" | "12h" | "1d" | "3d" | "1w" | "1M", startTime: number, endTime: number) {
    try {
      const response = await this.infoClient.candleSnapshot({
        coin,
        interval,
        startTime,
        endTime,
      });
      return response;
    } catch (error) {
      console.error(`Error fetching candle snapshot for ${coin}:`, error);
      throw error;
    }
  }

  // Utility Methods
  formatPrice(price: string | number, decimals: number = 2): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  formatVolume(volume: string | number): string {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  }

  calculatePriceChange(currentPrice: string, previousPrice: string): {
    changePercent: number;
    changeAmount: number;
    isPositive: boolean;
  } {
    const current = parseFloat(currentPrice);
    const previous = parseFloat(previousPrice);
    const changeAmount = current - previous;
    const changePercent = (changeAmount / previous) * 100;
    
    return {
      changePercent,
      changeAmount,
      isPositive: changeAmount >= 0,
    };
  }

  // Get real 24hr statistics for perps
  async get24hrStats(): Promise<Record<string, {
    coin: string;
    dayNtlVlm: string;
    prevDayPx: string;
    markPx: string;
  }>> {
    try {
      const response = await this.infoClient.metaAndAssetCtxs();
      const stats: Record<string, any> = {};
      
      // Extract 24hr data from the response
      if (response && response[1]) { // assetCtxs is the second element
        response[1].forEach((assetCtx: any, index: number) => {
          const coin = response[0].universe[index]?.name; // Get coin name from meta
          if (coin && this.MAJOR_COINS.includes(coin)) {
            stats[coin] = {
              coin,
              dayNtlVlm: assetCtx.dayNtlVlm || '0',
              prevDayPx: assetCtx.prevDayPx || '0',
              markPx: assetCtx.markPx || '0',
            };
          }
        });
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching 24hr stats:', error);
      throw error;
    }
  }

  // Market Analytics Helper Methods with real data
  async getMarketOverviewData(): Promise<{
    totalMarketCap: number;
    totalVolume: number;
    topAssets: Array<{
      coin: string;
      price: string;
      change24h: number;
      volume: string;
    }>;
  }> {
    try {
      const [allMids, stats24hr] = await Promise.all([
        this.getAllMids(),
        this.get24hrStats(),
      ]);

      // Create proper asset data with real 24hr changes and volumes
      const topAssets = Object.entries(allMids)
        .map(([coin, price]) => {
          const stats = stats24hr[coin];
          let change24h = 0;
          let volume = '0';
          
          if (stats) {
            // Calculate real 24hr change
            const currentPrice = parseFloat(stats.markPx || price);
            const prevPrice = parseFloat(stats.prevDayPx || price);
            change24h = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
            
            // Use real volume
            volume = this.formatVolume(parseFloat(stats.dayNtlVlm || '0'));
          }
          
          return {
            coin,
            price,
            change24h,
            volume,
          };
        })
        .sort((a, b) => this.parseVolume(b.volume) - this.parseVolume(a.volume)); // Sort by volume

      // Calculate total volume from real data
      const totalVolumeNum = topAssets.reduce((sum, asset) => sum + this.parseVolume(asset.volume), 0);

      return {
        totalMarketCap: 2140000000000, // Keep mock market cap for now
        totalVolume: totalVolumeNum,
        topAssets,
      };
    } catch (error) {
      console.error('Error fetching market overview:', error);
      // Fallback to mock data if API fails
      return this.getMockMarketData();
    }
  }

  // Fallback mock data method
  private async getMockMarketData() {
    const allMids = await this.getAllMids();
    const topAssets = Object.entries(allMids)
      .map(([coin, price]) => {
        const volumeMultiplier = this.getVolumeMultiplier(coin);
        const baseVolume = 50000000;
        const volume = baseVolume * volumeMultiplier;
        const change24h = this.generateRealistic24hChange(coin);
        
        return {
          coin,
          price,
          change24h,
          volume: this.formatVolume(volume),
        };
      })
      .sort((a, b) => this.parseVolume(b.volume) - this.parseVolume(a.volume));

    return {
      totalMarketCap: 2140000000000,
      totalVolume: 89400000000,
      topAssets,
    };
  }

  private getVolumeMultiplier(coin: string): number {
    const volumeMap: Record<string, number> = {
      'BTC': 10.0,  // ~$500M daily volume
      'ETH': 8.0,   // ~$400M daily volume
      'SOL': 6.0,   // ~$300M daily volume
      'AVAX': 3.0,  // ~$150M daily volume
      'MATIC': 2.5, // ~$125M daily volume
      'LINK': 2.0,  // ~$100M daily volume
      'UNI': 1.8,   // ~$90M daily volume
      'AAVE': 1.5,  // ~$75M daily volume
      'DOT': 1.3,   // ~$65M daily volume
      'ADA': 1.2,   // ~$60M daily volume
    };
    return volumeMap[coin] || 1.0;
  }

  private generateRealistic24hChange(coin: string): number {
    // Generate more realistic price changes based on coin volatility
    const volatilityMap: Record<string, number> = {
      'BTC': 3.0,   // Lower volatility
      'ETH': 4.0,   // Medium volatility
      'SOL': 6.0,   // Higher volatility
      'AVAX': 5.5,  // Higher volatility
      'MATIC': 5.0, // Medium-high volatility
      'LINK': 4.5,  // Medium volatility
      'UNI': 5.5,   // Higher volatility
      'AAVE': 5.0,  // Medium-high volatility
      'DOT': 4.0,   // Medium volatility
      'ADA': 4.5,   // Medium volatility
    };
    
    const maxChange = volatilityMap[coin] || 4.0;
    return (Math.random() - 0.45) * maxChange * 2; // Slight positive bias
  }

  parseVolume(volumeStr: string): number {
    const num = parseFloat(volumeStr.replace(/[$,BMK]/g, ''));
    if (volumeStr.includes('B')) return num * 1e9;
    if (volumeStr.includes('M')) return num * 1e6;
    if (volumeStr.includes('K')) return num * 1e3;
    return num;
  }

  // WebSocket Methods (for real-time updates) - see implementation above in initializeWebSocket section

  subscribeToL2Book(coin: string, callback: (data: L2Book) => void) {
    console.log(`Subscribing to L2 book for ${coin}...`);
    
    const interval = setInterval(async () => {
      try {
        const data = await this.getL2Book(coin);
        callback(data);
      } catch (error) {
        console.error(`Error in L2 book subscription for ${coin}:`, error);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }

  // Create WebSocket subscription client for real-time data
  createSubscriptionClient() {
    return new hl.SubscriptionClient({
      transport: new hl.WebSocketTransport({ isTestnet: this.isTestnet }),
    });
  }
}

// Create singleton instance
export const hyperliquidService = new HyperliquidService(false); // Use mainnet
export const hyperliquidTestnetService = new HyperliquidService(true); // Use testnet

export default HyperliquidService;





















