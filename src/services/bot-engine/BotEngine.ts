import { MarketDataService } from './MarketDataService';
import { PaperTradingEngine } from './PaperTradingEngine';
import { LiveTradingEngine } from './LiveTradingEngine';
import { BaseStrategy } from './strategies/BaseStrategy';
import { StrategyFactory } from './strategies/StrategyFactory';
import { 
  BotInstance, 
  StrategyConfig, 
  TradingSignal,
  Position,
  Trade,
  BotStatus 
} from './types';

/**
 * Bot Engine
 * 
 * Main orchestrator that:
 * 1. Manages bot instances
 * 2. Runs strategies
 * 3. Executes trades (paper or live)
 * 4. Monitors positions
 * 5. Tracks performance
 */

export class BotEngine {
  private marketData: MarketDataService;
  private paperTrading: PaperTradingEngine;
  private liveTrading: LiveTradingEngine;
  private bots: Map<string, BotInstance> = new Map();
  private strategies: Map<string, BaseStrategy> = new Map();
  
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_FREQUENCY = 1000; // 1 second
  
  private isRunning: boolean = false;

  constructor(isTestnet: boolean = false) {
    this.marketData = new MarketDataService(isTestnet);
    this.paperTrading = new PaperTradingEngine(this.marketData);
    this.liveTrading = new LiveTradingEngine(this.marketData);
  }

  /**
   * Set exchange client for live trading
   */
  public setExchangeClient(exchangeClient: any) {
    this.liveTrading.setExchangeClient(exchangeClient);
    console.log('🔗 Bot Engine connected to live trading');
  }

  /**
   * Initialize the bot engine
   */
  public async initialize(): Promise<void> {
    console.log('🤖 Initializing Bot Engine...');
    await this.marketData.initialize();
    console.log('✅ Bot Engine initialized');
  }

  /**
   * Start the bot engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Bot Engine already running');
      return;
    }

    console.log('▶️ Starting Bot Engine...');
    this.isRunning = true;

    // Start the main loop
    this.updateInterval = setInterval(() => {
      this.update();
    }, this.UPDATE_FREQUENCY);

    console.log('✅ Bot Engine started');
  }

  /**
   * Stop the bot engine
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('⏸️ Stopping Bot Engine...');
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('✅ Bot Engine stopped');
  }

  /**
   * Main update loop
   * Called every second
   */
  private async update(): Promise<void> {
    try {
      // 1. Update all positions
      const { closedPositions } = await this.paperTrading.updatePositions();
      
      // Update bot performance for closed positions
      for (const trade of closedPositions) {
        this.updateBotPerformance(trade.botId, trade);
      }

      // 2. Generate signals for all active bots
      for (const [botId, bot] of Array.from(this.bots.entries())) {
        if (bot.status !== 'running') {
          continue;
        }

        try {
          await this.processBotSignals(bot);
        } catch (error) {
          console.error(`Error processing bot ${botId}:`, error);
          this.handleBotError(botId, error);
        }
      }
    } catch (error) {
      console.error('Error in bot engine update:', error);
    }
  }

  /**
   * Process signals for a bot
   */
  private async processBotSignals(bot: BotInstance): Promise<void> {
    const strategy = this.strategies.get(bot.strategyId);
    if (!strategy) {
      return;
    }

    const config = strategy.getConfig();
    
    // Check if bot can open new positions
    const currentPositions = this.paperTrading.getBotPositions(bot.id);
    if (currentPositions.length >= config.maxPositions) {
      return; // Already at max positions
    }

    // Generate signals for all pairs
    for (const coin of config.pairs) {
      const signal = await strategy.generateSignal(coin);
      
      if (signal && signal.type !== 'NONE') {
        // Execute the signal
        await this.executeSignal(bot, signal, config);
      }
    }
  }

  /**
   * Execute a trading signal
   */
  private async executeSignal(
    bot: BotInstance,
    signal: TradingSignal,
    config: StrategyConfig
  ): Promise<void> {
    // Check if already have a position in this coin
    const existingPosition = bot.positions.find(p => p.coin === signal.coin);
    if (existingPosition) {
      return; // Already have a position in this coin
    }

    try {
      // Calculate position size (in base currency)
      const positionSize = config.positionSize / signal.price;

      // Choose trading engine based on bot mode
      const tradingEngine = bot.mode === 'live' ? this.liveTrading : this.paperTrading;
      
      // Safety check for live trading
      if (bot.mode === 'live' && !this.liveTrading.isConnected()) {
        console.warn(`⚠️ Bot ${bot.name} is set to live mode but exchange client not connected. Using paper trading.`);
        const position = await this.paperTrading.openPosition(
          bot.id,
          bot.strategyId,
          signal.coin,
          signal.type === 'BUY' ? 'buy' : 'sell',
          positionSize,
          config.stopLossPercent,
          config.takeProfitPercent
        );
        bot.positions.push(position);
        return;
      }

      // Open position
      const position = await tradingEngine.openPosition(
        bot.id,
        bot.strategyId,
        signal.coin,
        signal.type === 'BUY' ? 'buy' : 'sell',
        positionSize,
        config.stopLossPercent,
        config.takeProfitPercent
      );

      // Add position to bot
      bot.positions.push(position);

      const modeLabel = bot.mode === 'live' ? '🚨 LIVE' : '📝 PAPER';
      console.log(`✅ Bot ${bot.name} ${modeLabel} opened ${signal.type} position: ${signal.coin} @ ${signal.price}`);
    } catch (error) {
      console.error(`Failed to execute signal for bot ${bot.name}:`, error);
      bot.errorCount++;
      throw error;
    }
  }

  /**
   * Deploy a new bot
   */
  public async deployBot(config: StrategyConfig): Promise<BotInstance> {
    // Validate config
    const validation = StrategyFactory.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid strategy config: ${validation.errors.join(', ')}`);
    }

    // Create strategy
    const strategy = StrategyFactory.createStrategy(config, this.marketData);
    await strategy.initialize();
    this.strategies.set(config.id, strategy);

    // Create bot instance
    const bot: BotInstance = {
      id: this.generateBotId(),
      name: config.name,
      strategyId: config.id,
      status: 'running',
      mode: config.mode,
      positions: [],
      performance: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        todayPnl: 0,
        avgHoldTime: 0,
        avgPnlPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      },
      startedAt: Date.now(),
      lastTradeAt: 0,
      errorCount: 0,
    };

    this.bots.set(bot.id, bot);
    
    console.log(`🚀 Bot deployed: ${bot.name} (${config.type})`);
    
    return bot;
  }

  /**
   * Pause a bot
   */
  public pauseBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = 'paused';
      console.log(`⏸️ Bot paused: ${bot.name}`);
    }
  }

  /**
   * Resume a bot
   */
  public resumeBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = 'running';
      console.log(`▶️ Bot resumed: ${bot.name}`);
    }
  }

  /**
   * Stop a bot
   */
  public async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (!bot) {
      return;
    }

    // Close all positions
    for (const position of bot.positions) {
      await this.paperTrading.closePosition(position.id, 'Bot stopped');
    }
    bot.positions = [];

    // Stop the strategy
    const strategy = this.strategies.get(bot.strategyId);
    if (strategy) {
      await strategy.cleanup();
      this.strategies.delete(bot.strategyId);
    }

    bot.status = 'stopped';
    console.log(`🛑 Bot stopped: ${bot.name}`);
  }

  /**
   * Get all bots
   */
  public getBots(): BotInstance[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get a specific bot
   */
  public getBot(botId: string): BotInstance | null {
    return this.bots.get(botId) || null;
  }

  /**
   * Get bot positions (including current prices)
   */
  public getBotPositions(botId: string): Position[] {
    return this.paperTrading.getBotPositions(botId);
  }

  /**
   * Get bot trades
   */
  public getBotTrades(botId: string): Trade[] {
    return this.paperTrading.getBotTrades(botId);
  }

  /**
   * Update bot performance metrics
   */
  private updateBotPerformance(botId: string, trade: Trade): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      return;
    }

    const stats = this.paperTrading.getBotStatistics(botId);
    
    bot.performance = {
      totalTrades: stats.totalTrades,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      winRate: stats.winRate,
      totalPnl: stats.totalPnl,
      todayPnl: this.calculateTodayPnl(botId),
      avgHoldTime: stats.avgHoldTime,
      avgPnlPercent: stats.avgPnlPercent,
      maxDrawdown: 0, // TODO: Calculate drawdown
      sharpeRatio: 0, // TODO: Calculate Sharpe ratio
    };

    bot.lastTradeAt = Date.now();

    // Remove closed position from bot
    bot.positions = bot.positions.filter(p => p.id !== trade.id);
  }

  /**
   * Calculate today's P&L
   */
  private calculateTodayPnl(botId: string): number {
    const trades = this.paperTrading.getBotTrades(botId);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    return trades
      .filter(t => t.closedAt >= todayStart)
      .reduce((sum, t) => sum + t.pnl, 0);
  }

  /**
   * Handle bot error
   */
  private handleBotError(botId: string, error: any): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      return;
    }

    bot.errorCount++;
    bot.lastError = error.message || 'Unknown error';

    // Pause bot after 5 consecutive errors
    if (bot.errorCount >= 5) {
      bot.status = 'error';
      console.error(`❌ Bot ${bot.name} stopped due to errors`);
    }
  }

  /**
   * Generate unique bot ID
   */
  private generateBotId(): string {
    return `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  public async cleanup(): Promise<void> {
    this.stop();
    
    // Stop all bots
    for (const botId of Array.from(this.bots.keys())) {
      await this.stopBot(botId);
    }
    
    this.marketData.disconnect();
    console.log('✅ Bot Engine cleaned up');
  }
}

