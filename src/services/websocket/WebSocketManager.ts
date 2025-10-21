import * as hl from '@nktkas/hyperliquid';

/**
 * WebSocket Manager
 * 
 * Handles real-time market data connections to Hyperliquid
 * Provides: Price updates, Order book updates, Trade stream
 */

export interface PriceUpdate {
  coin: string;
  price: number;
  timestamp: number;
}

export interface OrderBookUpdate {
  coin: string;
  bids: Array<[number, number]>; // [price, size]
  asks: Array<[number, number]>; // [price, size]
  timestamp: number;
}

export interface TradeUpdate {
  coin: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;
type OrderBookCallback = (update: OrderBookUpdate) => void;
type TradeCallback = (update: TradeUpdate) => void;

export class WebSocketManager {
  private infoClient: hl.InfoClient | null = null;
  private priceSubscribers: Map<string, Set<PriceCallback>> = new Map();
  private orderbookSubscribers: Map<string, Set<OrderBookCallback>> = new Map();
  private tradeSubscribers: Map<string, Set<TradeCallback>> = new Map();
  
  private currentPrices: Map<string, number> = new Map();
  private currentOrderBooks: Map<string, OrderBookUpdate> = new Map();
  
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private isTestnet: boolean = false) {}

  /**
   * Initialize WebSocket connection
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to Hyperliquid API...');
      
      // Create InfoClient for data fetching
      this.infoClient = new hl.InfoClient({
        transport: new hl.HttpTransport({ isTestnet: this.isTestnet }),
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Start polling for price updates
      this.startPricePolling();
      
      console.log('✅ Hyperliquid API connected successfully');
    } catch (error) {
      console.error('❌ Hyperliquid API connection failed:', error);
      this.handleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect
   */
  public disconnect(): void {
    if (this.infoClient) {
      console.log('🔌 Disconnecting from Hyperliquid API...');
      
      // Stop polling
      if (this.priceUpdateInterval) {
        clearInterval(this.priceUpdateInterval);
        this.priceUpdateInterval = null;
      }
      
      this.infoClient = null;
      this.isConnected = false;
      this.priceSubscribers.clear();
      this.orderbookSubscribers.clear();
      this.tradeSubscribers.clear();
      console.log('✅ Hyperliquid API disconnected');
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, this.reconnectDelay);
  }

  /**
   * Subscribe to price updates for a coin
   */
  public subscribeToPrice(coin: string, callback: PriceCallback): () => void {
    if (!this.priceSubscribers.has(coin)) {
      this.priceSubscribers.set(coin, new Set());
      this.startPriceSubscription(coin);
    }

    this.priceSubscribers.get(coin)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.priceSubscribers.get(coin);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.priceSubscribers.delete(coin);
          this.stopPriceSubscription(coin);
        }
      }
    };
  }

  /**
   * Subscribe to order book updates for a coin
   */
  public subscribeToOrderBook(coin: string, callback: OrderBookCallback): () => void {
    if (!this.orderbookSubscribers.has(coin)) {
      this.orderbookSubscribers.set(coin, new Set());
      this.startOrderBookSubscription(coin);
    }

    this.orderbookSubscribers.get(coin)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.orderbookSubscribers.get(coin);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.orderbookSubscribers.delete(coin);
          this.stopOrderBookSubscription(coin);
        }
      }
    };
  }

  /**
   * Subscribe to trade stream for a coin
   */
  public subscribeToTrades(coin: string, callback: TradeCallback): () => void {
    if (!this.tradeSubscribers.has(coin)) {
      this.tradeSubscribers.set(coin, new Set());
      this.startTradeSubscription(coin);
    }

    this.tradeSubscribers.get(coin)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.tradeSubscribers.get(coin);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.tradeSubscribers.delete(coin);
          this.stopTradeSubscription(coin);
        }
      }
    };
  }

  /**
   * Get current price for a coin
   */
  public getCurrentPrice(coin: string): number | null {
    return this.currentPrices.get(coin) || null;
  }

  /**
   * Get current order book for a coin
   */
  public getCurrentOrderBook(coin: string): OrderBookUpdate | null {
    return this.currentOrderBooks.get(coin) || null;
  }

  /**
   * Start price polling
   */
  private startPricePolling(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.priceUpdateInterval = setInterval(async () => {
      await this.updateAllPrices();
    }, 2000); // Update every 2 seconds

    console.log('📊 Started price polling (2s interval)');
  }

  /**
   * Update all prices for subscribed coins
   */
  private async updateAllPrices(): Promise<void> {
    if (!this.infoClient || !this.isConnected) {
      return;
    }

    try {
      // Get all subscribed coins
      const subscribedCoins = Array.from(this.priceSubscribers.keys());
      if (subscribedCoins.length === 0) {
        return;
      }

      // Fetch all mids
      const allMids = await this.infoClient.allMids();
      
      // Update prices for subscribed coins
      for (const coin of subscribedCoins) {
        if (allMids && allMids[coin]) {
          const price = parseFloat(allMids[coin]);
          const previousPrice = this.currentPrices.get(coin);
          
          // Only notify if price changed
          if (previousPrice !== price) {
            this.currentPrices.set(coin, price);

            const update: PriceUpdate = {
              coin,
              price,
              timestamp: Date.now(),
            };

            // Notify all subscribers
            const subscribers = this.priceSubscribers.get(coin);
            if (subscribers) {
              subscribers.forEach(callback => callback(update));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  /**
   * Start price subscription for a coin
   */
  private startPriceSubscription(coin: string): void {
    console.log(`📊 Starting price subscription for ${coin}`);
    // Price updates are handled by the polling mechanism
  }

  /**
   * Start order book subscription for a coin
   */
  private startOrderBookSubscription(coin: string): void {
    console.log(`📖 Starting order book subscription for ${coin}`);
    // Order book updates would be handled by polling if needed
    // For now, we'll implement basic order book fetching
    this.updateOrderBook(coin);
  }

  /**
   * Update order book for a coin
   */
  private async updateOrderBook(coin: string): Promise<void> {
    if (!this.infoClient || !this.isConnected) {
      return;
    }

    try {
      const l2Book = await this.infoClient.l2Book({ coin });
      
      if (l2Book && l2Book.levels) {
        const bids: Array<[number, number]> = l2Book.levels[0].map((level: any) => [
          parseFloat(level.px),
          parseFloat(level.sz),
        ]);

        const asks: Array<[number, number]> = l2Book.levels[1].map((level: any) => [
          parseFloat(level.px),
          parseFloat(level.sz),
        ]);

        const update: OrderBookUpdate = {
          coin,
          bids,
          asks,
          timestamp: Date.now(),
        };

        this.currentOrderBooks.set(coin, update);

        // Notify all subscribers
        const subscribers = this.orderbookSubscribers.get(coin);
        if (subscribers) {
          subscribers.forEach(callback => callback(update));
        }
      }
    } catch (error) {
      console.error(`Error updating order book for ${coin}:`, error);
    }
  }

  /**
   * Start trade stream subscription for a coin
   */
  private startTradeSubscription(coin: string): void {
    console.log(`📈 Starting trade stream subscription for ${coin}`);
    // Trade updates would be handled by polling if needed
    // For now, we'll skip trade stream as it's not critical for basic bot operation
  }

  /**
   * Stop price subscription for a coin
   */
  private stopPriceSubscription(coin: string): void {
    console.log(`🛑 Stopping price subscription for ${coin}`);
    // Polling-based, no explicit unsubscribe needed
  }

  /**
   * Stop order book subscription for a coin
   */
  private stopOrderBookSubscription(coin: string): void {
    console.log(`🛑 Stopping order book subscription for ${coin}`);
    // Polling-based, no explicit unsubscribe needed
  }

  /**
   * Stop trade subscription for a coin
   */
  private stopTradeSubscription(coin: string): void {
    console.log(`🛑 Stopping trade stream subscription for ${coin}`);
    // Polling-based, no explicit unsubscribe needed
  }

  /**
   * Check if WebSocket is connected
   */
  public isWSConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null;

export const getWebSocketManager = (isTestnet: boolean = false): WebSocketManager => {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager(isTestnet);
  }
  return wsManagerInstance;
};

