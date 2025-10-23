import { StrategyConfig, BotInstance } from '../bot-engine/types';

/**
 * Browser-compatible KV client using Vercel KV REST API.
 * Uses localStorage as fallback if KV is not available.
 */
class KVClient {
  private kvUrl: string | null = null;
  private kvToken: string | null = null;

  constructor() {
    // Vercel KV provides these environment variables:
    // - KV_REST_API_URL: The REST API endpoint
    // - KV_REST_API_TOKEN: The authentication token
    // For React apps, they need to be prefixed with REACT_APP_
    
    this.kvUrl = process.env.REACT_APP_KV_REST_API_URL || null;
    this.kvToken = process.env.REACT_APP_KV_REST_API_TOKEN || null;
    
    if (this.kvUrl && this.kvToken) {
      console.log('✅ KV REST API client initialized with URL:', this.kvUrl);
    } else {
      console.warn('⚠️ KV REST API credentials not found, using localStorage fallback');
      if (!this.kvUrl) console.warn('  - Missing: REACT_APP_KV_REST_API_URL');
      if (!this.kvToken) console.warn('  - Missing: REACT_APP_KV_REST_API_TOKEN');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.kvUrl || !this.kvToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.kvUrl}/get/${encodeURIComponent(key)}`, {
        headers: {
          'Authorization': `Bearer ${this.kvToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('KV GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<boolean> {
    if (!this.kvUrl || !this.kvToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.kvUrl}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      return response.ok;
    } catch (error) {
      console.error('KV SET error:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.kvUrl !== null && this.kvToken !== null;
  }
}

const kvClient = new KVClient();

export class BotPersistenceService {

  /**
   * Generates a user ID based on the wallet address.
   * If no address is provided, a generic ID is used (for non-wallet users or fallback).
   */
  public static getUserId(address: string | undefined): string {
    return address ? `user:${address.toLowerCase()}` : 'user:anonymous';
  }

  /**
   * Tests the connection to Vercel KV.
   */
  public static async testConnection(): Promise<boolean> {
    if (!kvClient.isAvailable()) {
      console.log('🌐 KV not available - using localStorage instead');
      return false;
    }
    
    try {
      // Attempt a simple operation to check connectivity
      const success = await kvClient.set('test:connection', 'ok');
      if (success) {
        console.log('✅ Vercel KV connection successful.');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Vercel KV connection failed:', error);
      return false;
    }
  }

  /**
   * Saves all strategies for a given user.
   */
  public static async saveStrategies(userId: string, strategies: StrategyConfig[]): Promise<void> {
    const key = `${userId}:strategies`;
    const value = JSON.stringify(strategies);

    if (kvClient.isAvailable()) {
      try {
        const success = await kvClient.set(key, value);
        if (success) {
          console.log(`💾 Saved ${strategies.length} strategies for ${userId} to KV.`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ KV save failed, falling back to localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(key, value);
      console.log(`💾 Saved ${strategies.length} strategies for ${userId} to localStorage.`);
    } catch (error) {
      console.error(`❌ Failed to save strategies:`, error);
      throw error;
    }
  }

  /**
   * Loads all strategies for a given user.
   */
  public static async loadStrategies(userId: string): Promise<StrategyConfig[]> {
    const key = `${userId}:strategies`;

    // Try KV first
    if (kvClient.isAvailable()) {
      try {
        const data = await kvClient.get(key);
        if (data) {
          const strategies = JSON.parse(data) as StrategyConfig[];
          console.log(`📂 Loaded ${strategies.length} strategies for ${userId} from KV.`);
          return strategies;
        }
      } catch (error) {
        console.warn(`⚠️ KV load failed, trying localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const strategies = JSON.parse(data) as StrategyConfig[];
        console.log(`📂 Loaded ${strategies.length} strategies for ${userId} from localStorage.`);
        return strategies;
      }
    } catch (error) {
      console.error(`❌ Failed to load strategies:`, error);
    }

    return [];
  }

  /**
   * Adds a single strategy for a given user.
   */
  public static async addStrategy(userId: string, strategy: StrategyConfig): Promise<void> {
    const strategies = await this.loadStrategies(userId);
    strategies.push(strategy);
    await this.saveStrategies(userId, strategies);
  }

  /**
   * Updates a single strategy for a given user.
   */
  public static async updateStrategy(userId: string, strategyId: string, updates: Partial<StrategyConfig>): Promise<void> {
    let strategies = await this.loadStrategies(userId);
    strategies = strategies.map(s => 
      s.id === strategyId ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    await this.saveStrategies(userId, strategies);
  }

  /**
   * Deletes a single strategy for a given user.
   */
  public static async deleteStrategy(userId: string, strategyId: string): Promise<void> {
    let strategies = await this.loadStrategies(userId);
    strategies = strategies.filter(s => s.id !== strategyId);
    await this.saveStrategies(userId, strategies);
  }

  /**
   * Saves all deployed bots for a given user.
   */
  public static async saveBots(userId: string, bots: BotInstance[]): Promise<void> {
    const key = `${userId}:bots`;
    const value = JSON.stringify(bots);

    if (kvClient.isAvailable()) {
      try {
        const success = await kvClient.set(key, value);
        if (success) {
          console.log(`💾 Saved ${bots.length} bots for ${userId} to KV.`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ KV save failed, falling back to localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(key, value);
      console.log(`💾 Saved ${bots.length} bots for ${userId} to localStorage.`);
    } catch (error) {
      console.error(`❌ Failed to save bots:`, error);
      throw error;
    }
  }

  /**
   * Loads all deployed bots for a given user.
   */
  public static async loadBots(userId: string): Promise<BotInstance[]> {
    const key = `${userId}:bots`;

    // Try KV first
    if (kvClient.isAvailable()) {
      try {
        const data = await kvClient.get(key);
        if (data) {
          const bots = JSON.parse(data) as BotInstance[];
          console.log(`📂 Loaded ${bots.length} bots for ${userId} from KV.`);
          return bots;
        }
      } catch (error) {
        console.warn(`⚠️ KV load failed, trying localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const bots = JSON.parse(data) as BotInstance[];
        console.log(`📂 Loaded ${bots.length} bots for ${userId} from localStorage.`);
        return bots;
      }
    } catch (error) {
      console.error(`❌ Failed to load bots:`, error);
    }

    return [];
  }
}