import { 
  WebSocketManager, 
  getWebSocketManager,
  PriceUpdate, 
  OrderBookUpdate, 
  TradeUpdate 
} from '../websocket/WebSocketManager';

/**
 * Market Data Service
 * 
 * Aggregates and processes real-time market data
 * Provides clean interface for strategy engines
 */

export interface MarketSnapshot {
  coin: string;
  price: number;
  orderBook: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
    bidDepth: number; // Total size of bids
    askDepth: number; // Total size of asks
    spread: number; // Best ask - best bid
    spreadPercent: number; // Spread as % of mid price
  } | null;
  recentTrades: TradeUpdate[];
  timestamp: number;
}

export interface PriceChange {
  coin: string;
  currentPrice: number;
  previousPrice: number;
  change: number; // Absolute change
  changePercent: number; // % change
  timeWindow: number; // milliseconds
}

export class MarketDataService {
  private wsManager: WebSocketManager;
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>> = new Map();
  private tradeHistory: Map<string, TradeUpdate[]> = new Map();
  private orderBookCache: Map<string, OrderBookUpdate> = new Map();
  
  private readonly PRICE_HISTORY_LENGTH = 1000; // Keep last 1000 price updates
  private readonly TRADE_HISTORY_LENGTH = 100; // Keep last 100 trades
  private readonly PRICE_HISTORY_DURATION = 3600000; // 1 hour in ms

  constructor(isTestnet: boolean = false) {
    this.wsManager = getWebSocketManager(isTestnet);
  }

  /**
   * Initialize market data service
   */
  public async initialize(): Promise<void> {
    await this.wsManager.connect();
    console.log('✅ MarketDataService initialized');
  }

  /**
   * Subscribe to a coin's market data
   */
  public subscribeToCoin(coin: string): void {
    console.log(`📊 Subscribing to market data for ${coin}`);

    // Subscribe to prices
    this.wsManager.subscribeToPrice(coin, (update) => {
      this.storePriceUpdate(update);
    });

    // Subscribe to order book
    this.wsManager.subscribeToOrderBook(coin, (update) => {
      this.storeOrderBookUpdate(update);
    });

    // Subscribe to trades
    this.wsManager.subscribeToTrades(coin, (update) => {
      this.storeTradeUpdate(update);
    });
  }

  /**
   * Unsubscribe from a coin's market data
   */
  public unsubscribeFromCoin(coin: string): void {
    console.log(`🛑 Unsubscribing from market data for ${coin}`);
    this.priceHistory.delete(coin);
    this.tradeHistory.delete(coin);
    this.orderBookCache.delete(coin);
  }

  /**
   * Get current price for a coin
   */
  public getCurrentPrice(coin: string): number | null {
    return this.wsManager.getCurrentPrice(coin);
  }

  /**
   * Get current market snapshot for a coin
   */
  public getMarketSnapshot(coin: string): MarketSnapshot | null {
    const price = this.wsManager.getCurrentPrice(coin);
    const orderBook = this.orderBookCache.get(coin);
    const recentTrades = this.tradeHistory.get(coin) || [];

    if (!price) {
      return null;
    }

    let processedOrderBook = null;
    if (orderBook) {
      const bidDepth = orderBook.bids.reduce((sum, [_, size]) => sum + size, 0);
      const askDepth = orderBook.asks.reduce((sum, [_, size]) => sum + size, 0);
      const bestBid = orderBook.bids[0]?.[0] || 0;
      const bestAsk = orderBook.asks[0]?.[0] || 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / price) * 100;

      processedOrderBook = {
        bids: orderBook.bids,
        asks: orderBook.asks,
        bidDepth,
        askDepth,
        spread,
        spreadPercent,
      };
    }

    return {
      coin,
      price,
      orderBook: processedOrderBook,
      recentTrades,
      timestamp: Date.now(),
    };
  }

  /**
   * Get price change over a time window
   */
  public getPriceChange(coin: string, timeWindowMs: number): PriceChange | null {
    const history = this.priceHistory.get(coin);
    if (!history || history.length < 2) {
      return null;
    }

    const currentPrice = history[history.length - 1].price;
    const cutoffTime = Date.now() - timeWindowMs;

    // Find price at the start of the time window
    const historicalPrice = history.find(point => point.timestamp >= cutoffTime);
    if (!historicalPrice) {
      return null;
    }

    const change = currentPrice - historicalPrice.price;
    const changePercent = (change / historicalPrice.price) * 100;

    return {
      coin,
      currentPrice,
      previousPrice: historicalPrice.price,
      change,
      changePercent,
      timeWindow: timeWindowMs,
    };
  }

  /**
   * Calculate order book imbalance ratio
   * Returns: bidDepth / askDepth
   * > 1 means more buying pressure
   * < 1 means more selling pressure
   */
  public getOrderBookImbalance(coin: string, depthLevels: number = 10): number | null {
    const orderBook = this.orderBookCache.get(coin);
    if (!orderBook) {
      return null;
    }

    const bidDepth = orderBook.bids
      .slice(0, depthLevels)
      .reduce((sum, [_, size]) => sum + size, 0);

    const askDepth = orderBook.asks
      .slice(0, depthLevels)
      .reduce((sum, [_, size]) => sum + size, 0);

    if (askDepth === 0) return null;

    return bidDepth / askDepth;
  }

  /**
   * Detect aggressive buying or selling
   * Returns: positive = buying pressure, negative = selling pressure
   */
  public getTradePressure(coin: string, lookbackTrades: number = 20): number | null {
    const trades = this.tradeHistory.get(coin);
    if (!trades || trades.length < lookbackTrades) {
      return null;
    }

    const recentTrades = trades.slice(-lookbackTrades);
    
    let buyVolume = 0;
    let sellVolume = 0;

    recentTrades.forEach(trade => {
      if (trade.side === 'buy') {
        buyVolume += trade.size;
      } else {
        sellVolume += trade.size;
      }
    });

    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) return 0;

    // Return -1 to 1 scale (-1 = all sells, +1 = all buys)
    return (buyVolume - sellVolume) / totalVolume;
  }

  /**
   * Store price update in history
   */
  private storePriceUpdate(update: PriceUpdate): void {
    if (!this.priceHistory.has(update.coin)) {
      this.priceHistory.set(update.coin, []);
    }

    const history = this.priceHistory.get(update.coin)!;
    history.push({
      price: update.price,
      timestamp: update.timestamp,
    });

    // Trim old data
    const cutoffTime = Date.now() - this.PRICE_HISTORY_DURATION;
    while (history.length > 0 && history[0].timestamp < cutoffTime) {
      history.shift();
    }

    // Also trim by length
    if (history.length > this.PRICE_HISTORY_LENGTH) {
      history.shift();
    }
  }

  /**
   * Store order book update
   */
  private storeOrderBookUpdate(update: OrderBookUpdate): void {
    this.orderBookCache.set(update.coin, update);
  }

  /**
   * Store trade update in history
   */
  private storeTradeUpdate(update: TradeUpdate): void {
    if (!this.tradeHistory.has(update.coin)) {
      this.tradeHistory.set(update.coin, []);
    }

    const history = this.tradeHistory.get(update.coin)!;
    history.push(update);

    // Trim to max length
    if (history.length > this.TRADE_HISTORY_LENGTH) {
      history.shift();
    }
  }

  /**
   * Get WebSocket connection status
   */
  public isConnected(): boolean {
    return this.wsManager.isWSConnected();
  }

  /**
   * Cleanup
   */
  public disconnect(): void {
    this.wsManager.disconnect();
    this.priceHistory.clear();
    this.tradeHistory.clear();
    this.orderBookCache.clear();
    console.log('✅ MarketDataService disconnected');
  }
}

