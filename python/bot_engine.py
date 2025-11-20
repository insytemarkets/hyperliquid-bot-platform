"""
🔥 REAL-TIME BOT ENGINE - Python Edition
Runs 24/7 on Render, connects to Hyperliquid WebSocket, writes to Supabase
"""

import asyncio
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
import json
import requests
from loguru import logger
from supabase import create_client, Client
from hyperliquid.info import Info
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(f"Missing Supabase credentials! URL: {bool(SUPABASE_URL)}, KEY: {bool(SUPABASE_KEY)}")

logger.info(f"🔗 Connecting to Supabase: {SUPABASE_URL[:30]}...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Hyperliquid (use mainnet by default, skip websocket for now)
info = Info(skip_ws=True)

# Hyperliquid API base URL
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz/info"

def fetch_l2_orderbook(coin: str) -> Optional[dict]:
    """Fetch L2 orderbook directly from Hyperliquid API (Python SDK doesn't have l2_book method)"""
    try:
        response = requests.post(
            HYPERLIQUID_API_URL,
            headers={'Content-Type': 'application/json'},
            json={'type': 'l2Book', 'coin': coin},
            timeout=5
        )
        
        if not response.ok:
            logger.warning(f"⚠️ L2 API request failed for {coin}: HTTP {response.status_code}")
            return None
        
        data = response.json()
        if data and len(data) > 0:
            return data[0]  # Returns { coin, levels: [[price, size], ...], time }
        return None
    except Exception as e:
        logger.error(f"❌ Error fetching L2 orderbook for {coin}: {e}")
        return None

logger.info("🚀 Bot Engine Starting...")

class BotEngine:
    """Main bot engine orchestrator"""
    
    def __init__(self):
        self.running_bots: Dict[str, 'BotInstance'] = {}
        
    async def start(self):
        """Start the bot engine"""
        logger.info("🔥 Bot Engine: Initializing...")
        
        # Initialize Hyperliquid Info client for market data
        logger.info("📡 Connecting to Hyperliquid API...")
        
        # Main loop
        while True:
            try:
                await self.tick()
                await asyncio.sleep(1)  # Run every second
            except Exception as e:
                logger.error(f"❌ Bot Engine error: {e}")
                await asyncio.sleep(5)
    
    async def tick(self):
        """Run one tick of the bot engine"""
        # Fetch all running bots from Supabase
        try:
            result = supabase.table('bot_instances')\
                .select('*, strategies(*)')\
                .eq('status', 'running')\
                .execute()
            
            bots = result.data if result.data else []
            logger.info(f"🔍 Found {len(bots)} active bot(s)")
            
            if len(bots) == 0:
                return  # No bots to run
        except Exception as e:
            logger.error(f"Failed to fetch bots from Supabase: {e}")
            return
        
        # Update last_tick_at for all bots
        for bot_data in bots:
            bot_id = bot_data['id']
            
            # Create bot instance if not exists
            if bot_id not in self.running_bots:
                self.running_bots[bot_id] = BotInstance(bot_data)
                logger.info(f"✅ Loaded bot: {bot_data['name']} ({bot_id})")
            
            # Update bot data
            self.running_bots[bot_id].update_config(bot_data)
            
            # Run bot tick
            try:
                await self.running_bots[bot_id].tick()
                
                # Update last_tick_at in database
                supabase.table('bot_instances')\
                    .update({'last_tick_at': datetime.now().isoformat()})\
                    .eq('id', bot_id)\
                    .execute()
                    
            except Exception as e:
                logger.error(f"❌ Error running bot {bot_id}: {e}")
                await self.log_bot_activity(
                    bot_id,
                    bot_data['user_id'],
                    'error',
                    f'Bot tick error: {str(e)}',
                    {'error': str(e)}
                )
        
        # Remove stopped bots
        active_bot_ids = {b['id'] for b in bots}
        stopped_bots = set(self.running_bots.keys()) - active_bot_ids
        for bot_id in stopped_bots:
            logger.info(f"🛑 Stopping bot: {bot_id}")
            del self.running_bots[bot_id]
    
    async def log_bot_activity(self, bot_id: str, user_id: str, log_type: str, message: str, data: dict):
        """Log bot activity to Supabase"""
        try:
            supabase.table('bot_logs').insert({
                'bot_id': bot_id,
                'user_id': user_id,
                'log_type': log_type,
                'message': message,
                'data': data,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")


class BotInstance:
    """Individual bot instance"""
    
    def __init__(self, bot_data: dict):
        self.bot_id = bot_data['id']
        self.user_id = bot_data['user_id']
        self.name = bot_data['name']
        self.mode = bot_data['mode']
        self.strategy = bot_data['strategies']
        self.positions: List[dict] = []
        self.last_prices: Dict[str, float] = {}
        self.candle_cache: Dict[str, dict] = {}  # Cache candles to avoid rate limits
        self.last_candle_fetch: Dict[str, float] = {}  # Track last fetch time per pair
        self.candle_cache_ttl = 60  # Cache candles for 60 seconds (increased from 30)
        self.last_analysis_log_time: float = 0  # Track last detailed analysis log
        self.last_market_metrics_log_time: float = 0  # Separate timer for market metrics (per pair)
        self.market_log_interval = 30  # Log market data every 30 seconds
        self.position_log_ids: Dict[str, str] = {}  # Track position status log IDs per pair (for updating in place)
        self.monitoring_log_ids: Dict[str, str] = {}  # Track monitoring log IDs per pair (for updating in place)
        self.market_metrics_log_ids: Dict[str, str] = {}  # Track market metrics log IDs per pair (for updating in place)
        self.last_position_update_time: Dict[str, float] = {}  # Track last position update time per pair (update every 5s)
        self.last_market_data_fetch: float = 0  # Track last market data fetch time
        self.cached_market_data: dict = {}  # Cache market data to avoid rate limits
        self.market_data_cache_ttl = 2  # Cache market data for 2 seconds
        self.last_position_close_time: Dict[str, float] = {}  # Track when positions were closed (cooldown period)
        self.position_cooldown = 60  # Wait 60 seconds after closing before opening new position on same pair
        self.position_metadata: Dict[str, dict] = {}  # Track per-position metadata for risk management
        # Metadata structure: {
        #   'highest_profit_pct': float,  # Peak profit percentage reached
        #   'highest_profit_price': float,  # Price at peak profit
        #   'first_profit_time': float or None,  # Timestamp when position first entered profit
        #   'original_stop_loss': float  # Initial stop loss (for break-even reference)
        # }
        self.liquidity_grab_events: Dict[str, dict] = {}  # Track wick events per pair for liquidity grab strategy
        # Structure: {'pair': {'wick_time': float, 'support_level': float, 'support_tf': str, 'wick_price': float}}
        self.liquidity_grab_timeout = 600  # 10 minutes (600 seconds) timeout for bounce - extended for more opportunities
        self.last_liquidity_grab_check: float = 0  # Track last liquidity grab check time
        self.liquidity_grab_check_interval = 5  # Check every 5 seconds (don't need to check every second)
        self.orderbook_v2_last_trade_time: Dict[str, float] = {}  # Track last trade time per pair for v2 strategy
        self.orderbook_v2_position_open_time: Dict[str, float] = {}  # Track when positions were opened for v2 strategy
        
    def update_config(self, bot_data: dict):
        """Update bot configuration"""
        self.strategy = bot_data['strategies']
    
    async def get_candles_cached(self, pair: str, interval: str, start_time: int, end_time: int):
        """Fetch candles with caching to avoid rate limits"""
        # Use a more stable cache key that doesn't change every second
        # Round start_time to nearest minute to improve cache hit rate
        start_time_rounded = (start_time // 60000) * 60000  # Round to nearest minute
        cache_key = f"{pair}_{interval}_{start_time_rounded}"
        current_time = datetime.now().timestamp()
        
        # Check if we have cached data
        if cache_key in self.candle_cache:
            last_fetch = self.last_candle_fetch.get(cache_key, 0)
            if current_time - last_fetch < self.candle_cache_ttl:
                logger.debug(f"Using cached candles for {pair} {interval}")
                return self.candle_cache[cache_key]
        
        # Add rate limiting delay (1.5 seconds between calls to avoid 429 errors)
        await asyncio.sleep(1.5)
        
        try:
            candles = info.candles_snapshot(pair, interval, start_time, end_time)
            
            # Cache the result
            self.candle_cache[cache_key] = candles
            self.last_candle_fetch[cache_key] = current_time
            
            return candles
        except Exception as e:
            logger.error(f"Error fetching candles for {pair}: {e}")
            # Return cached data if available, even if expired
            if cache_key in self.candle_cache:
                logger.warning(f"Using stale cache for {pair} due to API error")
                return self.candle_cache[cache_key]
            return None
    
    async def tick(self):
        """Run one tick of this bot"""
        # Fetch current prices with caching to avoid rate limits
        current_time = datetime.now().timestamp()
        all_mids = {}
        
        # Check cache first
        if current_time - self.last_market_data_fetch < self.market_data_cache_ttl:
            all_mids = self.cached_market_data
            logger.debug(f"Using cached market data (age: {current_time - self.last_market_data_fetch:.1f}s)")
        else:
            # Fetch fresh data
            try:
                all_mids = info.all_mids()
                self.cached_market_data = all_mids
                self.last_market_data_fetch = current_time
                logger.debug(f"Fetched fresh market data")
            except Exception as e:
                logger.error(f"Failed to fetch Hyperliquid prices: {e}")
                # Use cached data if available, even if expired
                if self.cached_market_data:
                    logger.warning(f"Using stale cache due to API error: {e}")
                    all_mids = self.cached_market_data
                else:
                    await self.log('error', f"❌ Failed to fetch market data: {str(e)}", {})
                    return
        
        # Update last prices
        for pair in self.strategy['pairs']:
            if pair in all_mids:
                self.last_prices[pair] = float(all_mids[pair])
        
        # Market snapshot removed - not needed, market metrics log shows all the info
        
        # Load open positions
        result = supabase.table('bot_positions')\
            .select('*')\
            .eq('bot_id', self.bot_id)\
            .eq('status', 'open')\
            .execute()
        
        self.positions = result.data if result.data else []
        
        # Run strategy
        if self.strategy['type'] == 'orderbook_imbalance':
            await self.run_orderbook_imbalance_strategy()
        elif self.strategy['type'] == 'orderbook_imbalance_v2':
            await self.run_orderbook_imbalance_v2_strategy()
        elif self.strategy['type'] == 'momentum_breakout':
            await self.run_momentum_breakout_strategy()
        elif self.strategy['type'] == 'multi_timeframe_breakout':
            await self.run_multi_timeframe_breakout_strategy()
        elif self.strategy['type'] == 'liquidity_grab':
            await self.run_liquidity_grab_strategy()
        elif self.strategy['type'] == 'support_liquidity':
            await self.run_support_liquidity_strategy()
        else:
            await self.run_default_strategy()
        
        # Check existing positions
        await self.check_positions()
    
    async def run_orderbook_imbalance_strategy(self):
        """Order Book Imbalance Strategy"""
        if len(self.positions) >= self.strategy['max_positions']:
            await self.log('info', f"⚠️ Max positions reached ({self.strategy['max_positions']})", {})
            return
        
        # Get available coins from meta
        try:
            meta = info.meta()
            available_coins = [asset['name'] for asset in meta['universe']]
            logger.info(f"📋 Available coins: {available_coins[:10]}...")  # Show first 10
        except Exception as e:
            logger.error(f"Failed to fetch meta: {e}")
        
        logger.info(f"🔍 Analyzing orderbook for pairs: {self.strategy['pairs']}")
        for pair in self.strategy['pairs']:
            # Skip if already have position
            if any(p['symbol'] == pair for p in self.positions):
                continue
            
            # Get L2 order book
            try:
                logger.debug(f"Fetching L2 orderbook for {pair}...")
                l2_data = fetch_l2_orderbook(pair)
                
                if not l2_data:
                    logger.warning(f"⚠️ Failed to fetch orderbook for {pair}")
                    continue
                    
                if 'levels' not in l2_data:
                    logger.warning(f"⚠️ Invalid L2 data structure for {pair}: Missing 'levels' key. Keys: {list(l2_data.keys()) if isinstance(l2_data, dict) else 'N/A'}")
                    continue
                
                bids = l2_data['levels'][0]  # [[price, size], ...]
                asks = l2_data['levels'][1]
                
                if not bids or not asks:
                    continue
                
                # Calculate order book imbalance
                bid_depth = sum(float(level[1]) for level in bids[:10])
                ask_depth = sum(float(level[1]) for level in asks[:10])
                
                total_depth = bid_depth + ask_depth
                if total_depth == 0:
                    continue
                
                imbalance_ratio = bid_depth / ask_depth if ask_depth > 0 else 0
                
                # Log order book analysis (only every 30 seconds to avoid spam)
                current_time = datetime.now().timestamp()
                if current_time - self.last_analysis_log_time >= self.market_log_interval:
                    await self.log(
                        'market_data',
                        f"📊 {pair} Order Book | Bid: {bid_depth:.2f} ({bid_depth/total_depth*100:.1f}%) | Ask: {ask_depth:.2f} ({ask_depth/total_depth*100:.1f}%) | Ratio: {imbalance_ratio:.2f}x",
                        {
                            'pair': pair,
                            'bid_depth': bid_depth,
                            'ask_depth': ask_depth,
                            'imbalance_ratio': imbalance_ratio,
                            'best_bid': float(bids[0][0]),
                            'best_ask': float(asks[0][0])
                        }
                    )
                    self.last_analysis_log_time = current_time
                
                # Entry signals
                if imbalance_ratio > 3.0:  # Strong buy pressure
                    success = await self.open_position(pair, 'long', float(asks[0][0]))
                    if success:
                        await self.log('signal', f"🟢 LONG signal: {pair} - Strong bid pressure ({imbalance_ratio:.2f}x)", {})
                elif imbalance_ratio < 0.33:  # Strong sell pressure
                    success = await self.open_position(pair, 'short', float(bids[0][0]))
                    if success:
                        await self.log('signal', f"🔴 SHORT signal: {pair} - Strong ask pressure ({imbalance_ratio:.2f}x)", {})
                    
            except Exception as e:
                logger.error(f"Error analyzing {pair}: {e}")
    
    async def run_orderbook_imbalance_v2_strategy(self):
        """Order Book Imbalance V2 Strategy - Percentage-based with hold time and cooldown"""
        # Get strategy parameters with defaults (check both direct and parameters dict)
        params = self.strategy.get('parameters', {})
        imbalance_threshold = params.get('imbalance_threshold', self.strategy.get('imbalance_threshold', 0.7))  # Default 70% bid volume
        depth = params.get('depth', self.strategy.get('depth', 10))  # Default 10 levels
        min_hold_time = params.get('min_hold_time', self.strategy.get('min_hold_time', 30))  # Default 30 seconds
        cooldown_period = params.get('cooldown_period', self.strategy.get('cooldown_period', 60))  # Default 60 seconds
        
        logger.debug(f"📊 OrderBook V2 Parameters: threshold={imbalance_threshold}, depth={depth}, min_hold={min_hold_time}s, cooldown={cooldown_period}s")
        
        current_time = datetime.now().timestamp()
        
        logger.info(f"🔍 Orderbook Imbalance V2 | Positions: {len(self.positions)}/{self.strategy['max_positions']} | Pairs: {self.strategy['pairs']}")
        
        for pair_raw in self.strategy['pairs']:
            # Normalize pair to Hyperliquid format (e.g., "BTC" not "BTCUSDT")
            pair = pair_raw.upper().replace('USDT', '').replace('USD', '') if isinstance(pair_raw, str) else str(pair_raw).upper()
            logger.debug(f"📋 Processing pair: {pair} (raw: {pair_raw}, from strategy: {self.strategy['pairs']})")
            
            # Skip if already have position (exit logic is handled in check_positions)
            # Check both normalized and raw pair for position matching
            has_open_position = any(p['symbol'] == pair or p['symbol'] == pair_raw for p in self.positions)
            
            # Get L2 order book (always fetch, even during cooldown, for exit checks)
            try:
                logger.debug(f"📖 Fetching orderbook for {pair}...")
                l2_data = fetch_l2_orderbook(pair)
                
                if not l2_data:
                    logger.warning(f"⚠️ {pair} Failed to fetch orderbook")
                    continue
                
                if 'levels' not in l2_data:
                    logger.warning(f"⚠️ {pair} L2 data missing 'levels' key. Keys: {list(l2_data.keys()) if isinstance(l2_data, dict) else 'N/A'}")
                    continue
                
                bids = l2_data['levels'][0]  # [[price, size], ...]
                asks = l2_data['levels'][1]
                
                if not bids or not asks:
                    logger.warning(f"⚠️ {pair} Empty bids/asks - Bids: {len(bids) if bids else 0}, Asks: {len(asks) if asks else 0}")
                    continue
                
                logger.debug(f"✅ {pair} Orderbook fetched: {len(bids)} bids, {len(asks)} asks")
                
                # Calculate order book imbalance (percentage-based) - matches tkinter app exactly
                bid_volume = sum(float(level[1]) for level in bids[:depth])
                ask_volume = sum(float(level[1]) for level in asks[:depth])
                total_volume = bid_volume + ask_volume
                
                if total_volume == 0:
                    logger.warning(f"⚠️ {pair} Zero total volume after summing {depth} levels")
                    continue
                
                imbalance_ratio = bid_volume / total_volume  # 0.0 to 1.0 (percentage) - matches tkinter app
                
                logger.debug(f"📊 {pair} Orderbook calc: Bid={bid_volume:.2f}, Ask={ask_volume:.2f}, Total={total_volume:.2f}, Imbalance={imbalance_ratio*100:.1f}%")
                
                # Log order book analysis (every 30 seconds)
                if current_time - self.last_analysis_log_time >= self.market_log_interval:
                    cooldown_remaining = max(0, cooldown_period - (current_time - self.orderbook_v2_last_trade_time.get(pair, 0)))
                    await self.log(
                        'market_data',
                        f"📊 {pair} Order Book V2 | Bid: {bid_volume:.2f} ({imbalance_ratio*100:.1f}%) | Ask: {ask_volume:.2f} ({(1-imbalance_ratio)*100:.1f}%) | Threshold: {imbalance_threshold*100:.0f}% | Cooldown: {int(cooldown_remaining)}s",
                        {
                            'pair': pair,
                            'bid_volume': bid_volume,
                            'ask_volume': ask_volume,
                            'imbalance_ratio': imbalance_ratio,
                            'best_bid': float(bids[0][0]),
                            'best_ask': float(asks[0][0]),
                            'cooldown_remaining': cooldown_remaining
                        }
                    )
                    self.last_analysis_log_time = current_time
                
                # Exit logic for open positions (check FIRST, even during cooldown)
                if has_open_position:
                    position = next((p for p in self.positions if p['symbol'] == pair), None)
                    if position:
                        position_open_time = self.orderbook_v2_position_open_time.get(pair, current_time)
                        time_in_position = current_time - position_open_time
                        
                        # Exit logic - matches tkinter app exactly:
                        # Don't exit if time < min_hold_time (return False in tkinter)
                        # If time >= min_hold_time: Exit if imbalance < (1-threshold) OR time > 2x min_hold_time
                        should_exit = False
                        exit_reason = ""
                        
                        # Only check exit conditions if min_hold_time has passed (matches tkinter app)
                        if time_in_position >= min_hold_time:
                            if position['side'] == 'long':
                                # Exit long if bid volume drops below (1 - threshold) = 0.3 (30%) - matches tkinter app
                                if imbalance_ratio < (1 - imbalance_threshold):
                                    should_exit = True
                                    exit_reason = f"Imbalance reversed ({imbalance_ratio*100:.1f}% < {(1-imbalance_threshold)*100:.0f}%)"
                            
                            # Exit if hold time exceeds 2x min_hold_time (force exit) - matches tkinter app
                            if not should_exit and time_in_position >= min_hold_time * 2:
                                should_exit = True
                                exit_reason = f"Max hold time reached ({int(time_in_position)}s)"
                        
                        if should_exit:
                            current_price = self.last_prices.get(pair, position['entry_price'])
                            await self.close_position(position, current_price, exit_reason)
                            self.orderbook_v2_last_trade_time[pair] = current_time
                            if pair in self.orderbook_v2_position_open_time:
                                del self.orderbook_v2_position_open_time[pair]
                            continue  # Skip entry logic after exit
                
                # Entry signals - Long when bid volume > threshold (only if not in cooldown and not max positions)
                if len(self.positions) >= self.strategy['max_positions']:
                    continue
                
                # Check cooldown period (only for entries, not exits)
                last_trade_time = self.orderbook_v2_last_trade_time.get(pair, 0)
                cooldown_remaining = cooldown_period - (current_time - last_trade_time)
                
                if cooldown_remaining > 0:
                    logger.debug(f"⏸️ {pair} In cooldown: {int(cooldown_remaining)}s remaining | Imbalance: {imbalance_ratio*100:.1f}%")
                    continue
                
                # Entry signal - Long when bid volume > threshold (matches tkinter app exactly)
                if imbalance_ratio > imbalance_threshold:
                    current_price = self.last_prices.get(pair)
                    if not current_price:
                        logger.debug(f"⚠️ {pair} No price data available")
                        continue
                    
                    logger.info(f"✅ {pair} ENTRY SIGNAL: Imbalance {imbalance_ratio*100:.1f}% > {imbalance_threshold*100:.0f}% threshold")
                    success = await self.open_position(pair, 'long', current_price)
                    if success:
                        self.orderbook_v2_last_trade_time[pair] = current_time
                        self.orderbook_v2_position_open_time[pair] = current_time
                        await self.log('signal', f"🟢 LONG V2: {pair} - Strong bid pressure ({imbalance_ratio*100:.1f}% > {imbalance_threshold*100:.0f}%)", {})
                    else:
                        logger.warning(f"⚠️ {pair} Entry signal triggered but position open failed")
                else:
                    logger.debug(f"📊 {pair} Imbalance {imbalance_ratio*100:.1f}% below threshold {imbalance_threshold*100:.0f}%")
                    
            except Exception as e:
                logger.error(f"Error in orderbook imbalance v2 for {pair}: {e}", exc_info=True)
                await self.log('error', f"❌ Error in orderbook v2 for {pair}: {str(e)}", {'error': str(e)})
    
    async def run_multi_timeframe_breakout_strategy(self):
        """Multi-Timeframe Breakout Strategy - Advanced breakout detection"""
        logger.info(f"🎯 Running Multi-Timeframe Breakout | Positions: {len(self.positions)}/{self.strategy['max_positions']} | Pairs: {self.strategy['pairs']}")
        
        # Check if max positions reached (but still process pairs for market metrics)
        max_positions_reached = len(self.positions) >= self.strategy['max_positions']
        
        for pair in self.strategy['pairs']:
            # Check if already have position (skip trading, but still log market data)
            has_open_position = any(p['symbol'] == pair for p in self.positions)
            
            try:
                # Get current price
                if pair not in self.last_prices:
                    await self.log('info', f"⚠️ No price data for {pair}", {})
                    continue
                current_price = self.last_prices[pair]
                
                # Get timeframe highs and lows from API candles (cached 60s)
                # Focus on 15m/30m/1h for better support levels (removed 5m - too spammy/risky)
                timeframes = ['15m', '30m', '1h']
                highs = {}
                lows = {}
                volumes = {}
                
                for tf in timeframes:
                    try:
                        # Get candles for timeframe - use proper interval
                        end_time = int(datetime.now().timestamp() * 1000)
                        if tf == '15m':
                            # For 15m: get last 20 candles (300 minutes = 5 hours)
                            start_time = end_time - (20 * 15 * 60 * 1000)
                            interval = '15m'
                        elif tf == '30m':
                            # For 30m: get last 20 candles (600 minutes = 10 hours)
                            start_time = end_time - (20 * 30 * 60 * 1000)
                            interval = '30m'
                        else:  # 1h
                            # For 1h: get last 20 candles (1200 minutes = 20 hours)
                            start_time = end_time - (20 * 60 * 60 * 1000)
                            interval = '1h'
                        
                        candles = await self.get_candles_cached(pair, interval, start_time, end_time)
                        
                        if candles and len(candles) > 0:
                            # CRITICAL: Use only the PREVIOUS closed candle (exclude the current incomplete candle)
                            # The last candle in the array is the current incomplete one, so we use the second-to-last
                            closed_candles = candles[:-1] if len(candles) > 1 else candles
                            
                            if len(closed_candles) > 0:
                                # Use the PREVIOUS closed candle's high/low (most recent completed candle)
                                last_closed_candle = closed_candles[-1]
                                tf_high = float(last_closed_candle['h'])
                                tf_low = float(last_closed_candle['l'])
                                
                                # Average volume from closed candles
                                tf_volume = sum(float(c['v']) for c in closed_candles) / len(closed_candles)
                                
                                highs[tf] = tf_high
                                lows[tf] = tf_low
                                volumes[tf] = tf_volume
                                
                                logger.debug(f"{pair} {tf}: Previous candle H={tf_high:.2f} L={tf_low:.2f}")
                            else:
                                # No closed candles yet - use current price as fallback
                                logger.warning(f"No closed candles for {pair} {tf}, using current price")
                                highs[tf] = current_price
                                lows[tf] = current_price
                                volumes[tf] = 0
                        else:
                            # No candles yet - skip this pair
                            logger.warning(f"No candle data for {pair} {tf}")
                            highs[tf] = current_price
                            lows[tf] = current_price
                            volumes[tf] = 0
                            
                    except Exception as e:
                        logger.warning(f"Failed to get {tf} data for {pair}: {e}")
                        highs[tf] = current_price
                        lows[tf] = current_price
                        volumes[tf] = 0
                
                # DOWNTREND FILTER: Check if last closed 1h candle is bearish
                # Skip trading during downtrends to avoid catching falling knives
                is_downtrend = False
                try:
                    if '1h' in highs and '1h' in lows:
                        # Get the last closed 1h candle to check trend
                        end_time_1h = int(datetime.now().timestamp() * 1000)
                        start_time_1h = end_time_1h - (2 * 60 * 60 * 1000)  # Last 2 hours (2 candles)
                        candles_1h = await self.get_candles_cached(pair, '1h', start_time_1h, end_time_1h)
                        
                        if candles_1h and len(candles_1h) > 1:
                            # Get the last CLOSED 1h candle (second-to-last in array)
                            last_closed_1h = candles_1h[-2] if len(candles_1h) > 1 else candles_1h[-1]
                            candle_close = float(last_closed_1h['c'])
                            candle_open = float(last_closed_1h['o'])
                            
                            # If close < open, it's a bearish candle (downtrend)
                            if candle_close < candle_open:
                                is_downtrend = True
                                logger.debug(f"📉 {pair} Downtrend detected: Last 1h candle bearish (O: ${candle_open:.2f} C: ${candle_close:.2f})")
                except Exception as e:
                    logger.warning(f"Failed to check downtrend for {pair}: {e}")
                    # If we can't check, allow trading (fail-safe)
                    is_downtrend = False
                
                # Calculate momentum score
                momentum_score = await self.calculate_momentum_score(pair, current_price)
                
                # Calculate volume weight
                volume_weight = await self.calculate_volume_weight(pair, volumes)
                
                # Note: is_downtrend flag set above, will check after market metrics logging
                
                # DIP-BUYING STRATEGY: Very tight wiggle for precise support entries
                # Only buy when price is very close to the low (within a few cents max)
                wiggle_low = 0.0005  # 0.05% - very tight for precise dip entries (~$0.08 at $168)
                wiggle_high = 0.005  # 0.5% - not used (highs disabled), but kept for consistency
                
                # Near highs? (price within 0.7% of high - only strong breakouts)
                # Use .get() to safely access dict values
                high_1h_val = highs.get('1h', 0)
                high_30m_val = highs.get('30m', 0)
                high_15m_val = highs.get('15m', 0)
                near_high_1h = abs(current_price - high_1h_val) / high_1h_val <= wiggle_high if high_1h_val > 0 else False
                near_high_30m = abs(current_price - high_30m_val) / high_30m_val <= wiggle_high if high_30m_val > 0 else False
                near_high_15m = abs(current_price - high_15m_val) / high_15m_val <= wiggle_high if high_15m_val > 0 else False
                
                # Near lows? Only buy when price is AT or BELOW the low (testing support from above)
                # Don't buy when price is ABOVE the low (that means it already broke and is now resistance)
                low_1h_val = lows.get('1h', 0)
                low_30m_val = lows.get('30m', 0)
                low_15m_val = lows.get('15m', 0)
                # Price must be <= low (or very close below it) to test support, not above it
                near_low_1h = (current_price <= low_1h_val and abs(current_price - low_1h_val) / low_1h_val <= wiggle_low) if low_1h_val > 0 else False
                near_low_30m = (current_price <= low_30m_val and abs(current_price - low_30m_val) / low_30m_val <= wiggle_low) if low_30m_val > 0 else False
                near_low_15m = (current_price <= low_15m_val and abs(current_price - low_15m_val) / low_15m_val <= wiggle_low) if low_15m_val > 0 else False
                
                # REQUIRE volume for ALL entries (no exceptions - volume confirms the move)
                has_volume = volume_weight > 0.5
                
                # ALWAYS log market metrics (every 30 seconds) - persists and updates automatically
                # This logs even when we have an open position so we can monitor levels
                # Use separate timer to ensure market metrics don't conflict with other logs
                current_time = datetime.now().timestamp()
                last_metrics_time = getattr(self, 'last_market_metrics_log_time', 0)
                # Log immediately on first run (last_metrics_time == 0) or every 30 seconds
                should_log_metrics = (last_metrics_time == 0) or (current_time - last_metrics_time >= self.market_log_interval)
                
                # Always log market metrics - this is critical for monitoring
                if should_log_metrics:
                    try:
                        # Calculate how close we are to triggers for ALL timeframes
                        # Handle division by zero safely
                        high_1h_val_safe = highs.get('1h', current_price) if highs.get('1h', 0) > 0 else current_price
                        low_1h_val_safe = lows.get('1h', current_price) if lows.get('1h', 0) > 0 else current_price
                        high_30m_val_safe = highs.get('30m', current_price) if highs.get('30m', 0) > 0 else current_price
                        low_30m_val_safe = lows.get('30m', current_price) if lows.get('30m', 0) > 0 else current_price
                        high_15m_val_safe = highs.get('15m', current_price) if highs.get('15m', 0) > 0 else current_price
                        low_15m_val_safe = lows.get('15m', current_price) if lows.get('15m', 0) > 0 else current_price
                        
                        high_1h_distance = ((current_price / high_1h_val_safe) - 1) * 100 if high_1h_val_safe > 0 else 0
                        low_1h_distance = ((low_1h_val_safe / current_price) - 1) * 100 if current_price > 0 else 0
                        high_30m_distance = ((current_price / high_30m_val_safe) - 1) * 100 if high_30m_val_safe > 0 else 0
                        low_30m_distance = ((low_30m_val_safe / current_price) - 1) * 100 if current_price > 0 else 0
                        high_15m_distance = ((current_price / high_15m_val_safe) - 1) * 100 if high_15m_val_safe > 0 else 0
                        low_15m_distance = ((low_15m_val_safe / current_price) - 1) * 100 if current_price > 0 else 0
                        
                        # Determine trend direction from last closed 1h candle
                        trend_direction = "Neutral"
                        try:
                            if '1h' in highs and '1h' in lows:
                                end_time_1h = int(datetime.now().timestamp() * 1000)
                                start_time_1h = end_time_1h - (2 * 60 * 60 * 1000)
                                candles_1h = await self.get_candles_cached(pair, '1h', start_time_1h, end_time_1h)
                                
                                if candles_1h and len(candles_1h) > 1:
                                    last_closed_1h = candles_1h[-2] if len(candles_1h) > 1 else candles_1h[-1]
                                    candle_close = float(last_closed_1h['c'])
                                    candle_open = float(last_closed_1h['o'])
                                    
                                    if candle_close > candle_open:
                                        trend_direction = "Bullish"
                                    elif candle_close < candle_open:
                                        trend_direction = "Bearish"
                                    else:
                                        trend_direction = "Neutral"
                        except Exception as e:
                            logger.debug(f"Failed to determine trend for {pair}: {e}")
                        
                        # Format market metrics message with all timeframe data
                        message = f"📊 {pair} | ${current_price:.2f} | 1h: ${highs.get('1h', 0):.2f}/${lows.get('1h', 0):.2f} ({high_1h_distance:+.3f}%/{low_1h_distance:+.3f}%) | 30m: ${highs.get('30m', 0):.2f}/${lows.get('30m', 0):.2f} ({high_30m_distance:+.3f}%/{low_30m_distance:+.3f}%) | 15m: ${highs.get('15m', 0):.2f}/${lows.get('15m', 0):.2f} ({high_15m_distance:+.3f}%/{low_15m_distance:+.3f}%) | Vol: {volume_weight:.2f}x | Trend: {trend_direction}"
                        data = {
                        'pair': pair,
                        'current_price': current_price,
                            'highs_1h': highs.get('1h', 0),
                            'lows_1h': lows.get('1h', 0),
                            'highs_30m': highs.get('30m', 0),
                            'lows_30m': lows.get('30m', 0),
                            'highs_15m': highs.get('15m', 0),
                            'lows_15m': lows.get('15m', 0),
                            'distance_to_high_1h': high_1h_distance,
                            'distance_to_low_1h': low_1h_distance,
                            'distance_to_high_30m': high_30m_distance,
                            'distance_to_low_30m': low_30m_distance,
                            'distance_to_high_15m': high_15m_distance,
                            'distance_to_low_15m': low_15m_distance,
                        'volume_weight': volume_weight,
                            'has_volume': has_volume,
                        'near_high_1h': False,  # Highs disabled - dip-buying only
                        'near_high_15m': False,  # Highs disabled - dip-buying only
                        'near_high_30m': False,  # Highs disabled - dip-buying only
                        'near_low_1h': near_low_1h,
                        'near_low_15m': near_low_15m,
                        'near_low_30m': near_low_30m,
                            'has_open_position': has_open_position,
                            'update_type': 'market_metrics'
                        }
                        
                        # Use log_update to update in place instead of creating new log entries
                        await self.log_update('market_metrics', pair, message, data)
                        self.last_market_metrics_log_time = current_time  # UPDATE the timer after logging!
                        logger.debug(f"✅ Market metrics logged for {pair}")
                    except Exception as e:
                        logger.error(f"❌ Failed to log market metrics for {pair}: {e}", exc_info=True)
                        # Still update timer so we don't spam errors
                        self.last_market_metrics_log_time = current_time
                
                # Update monitoring log when no position is open (every 5 seconds)
                if not has_open_position:
                    current_time_monitor = datetime.now().timestamp()
                    last_monitor_update = self.last_position_update_time.get(pair, 0)
                    
                    if current_time_monitor - last_monitor_update >= 5:  # Update every 5 seconds
                        # Calculate distances to entry levels (1h/30m/15m only)
                        high_1h_dist = ((highs.get('1h', 0) - current_price) / current_price * 100) if highs.get('1h', 0) > 0 else 0
                        low_1h_dist = ((current_price - lows.get('1h', 0)) / current_price * 100) if lows.get('1h', 0) > 0 else 0
                        high_30m_dist = ((highs.get('30m', 0) - current_price) / current_price * 100) if highs.get('30m', 0) > 0 else 0
                        low_30m_dist = ((current_price - lows.get('30m', 0)) / current_price * 100) if lows.get('30m', 0) > 0 else 0
                        high_15m_dist = ((highs.get('15m', 0) - current_price) / current_price * 100) if highs.get('15m', 0) > 0 else 0
                        low_15m_dist = ((current_price - lows.get('15m', 0)) / current_price * 100) if lows.get('15m', 0) > 0 else 0
                        
                        # Determine nearest entry level (LOWS ONLY - no high breakouts)
                        nearest_level = "Monitoring for dip-buy opportunities..."
                        if near_low_1h or near_low_30m or near_low_15m:
                            nearest_level = "Near LOW (Support) - Potential LONG entry"
                        # High breakouts disabled - too high risk
                        
                        # Determine trend direction from last closed 1h candle
                        trend_direction = "Neutral"
                        try:
                            if '1h' in highs and '1h' in lows:
                                end_time_1h = int(datetime.now().timestamp() * 1000)
                                start_time_1h = end_time_1h - (2 * 60 * 60 * 1000)
                                candles_1h = await self.get_candles_cached(pair, '1h', start_time_1h, end_time_1h)
                                
                                if candles_1h and len(candles_1h) > 1:
                                    last_closed_1h = candles_1h[-2] if len(candles_1h) > 1 else candles_1h[-1]
                                    candle_close = float(last_closed_1h['c'])
                                    candle_open = float(last_closed_1h['o'])
                                    
                                    if candle_close > candle_open:
                                        trend_direction = "Bullish"
                                    elif candle_close < candle_open:
                                        trend_direction = "Bearish"
                                    else:
                                        trend_direction = "Neutral"
                        except Exception as e:
                            logger.debug(f"Failed to determine trend for {pair}: {e}")
                        
                        message = f"👁️ Monitoring {pair} | Price: ${current_price:.2f} | {nearest_level} | 1h: ${highs.get('1h', 0):.2f}/${lows.get('1h', 0):.2f} ({high_1h_dist:+.2f}%/{low_1h_dist:+.2f}%) | 30m: ${highs.get('30m', 0):.2f}/${lows.get('30m', 0):.2f} ({high_30m_dist:+.2f}%/{low_30m_dist:+.2f}%) | 15m: ${highs.get('15m', 0):.2f}/${lows.get('15m', 0):.2f} ({high_15m_dist:+.2f}%/{low_15m_dist:+.2f}%) | Vol: {volume_weight:.2f}x | Trend: {trend_direction}"
                        data = {
                            'pair': pair,
                            'current_price': current_price,
                            'highs_1h': highs.get('1h', 0),
                            'lows_1h': lows.get('1h', 0),
                            'highs_30m': highs.get('30m', 0),
                            'lows_30m': lows.get('30m', 0),
                            'highs_15m': highs.get('15m', 0),
                            'lows_15m': lows.get('15m', 0),
                            'volume_weight': volume_weight,
                            'update_type': 'monitoring'
                        }
                        
                        await self.log_update('monitoring', pair, message, data)
                        self.last_position_update_time[pair] = current_time_monitor
                
                # Skip trading if in downtrend (after logging market metrics)
                if is_downtrend:
                    logger.debug(f"⏸️ {pair} Skipping trade - Market in downtrend")
                    continue  # Skip trading logic, but market metrics already logged above
                
                # Only check for new trades if we don't already have a position AND haven't reached max positions
                if has_open_position or max_positions_reached:
                    continue  # Skip trading logic, but we've already logged market data above
                
                # Check cooldown period - don't open new position immediately after closing
                current_time = datetime.now().timestamp()
                last_close_time = self.last_position_close_time.get(pair, 0)
                if current_time - last_close_time < self.position_cooldown:
                    remaining_cooldown = int(self.position_cooldown - (current_time - last_close_time))
                    logger.debug(f"⏸️ {pair} in cooldown ({remaining_cooldown}s remaining) - skipping trade check")
                    continue
                
                # SIMPLE LOGIC - Near high/low + volume = TRADE
                reason = ""
                
                # Debug: Log all conditions for trade decision with distances (LOWS ONLY - no high breakouts)
                dist_to_low_1h = ((current_price - low_1h_val) / low_1h_val * 100) if low_1h_val > 0 else 999
                dist_to_low_30m = ((current_price - low_30m_val) / low_30m_val * 100) if low_30m_val > 0 else 999
                dist_to_low_15m = ((current_price - low_15m_val) / low_15m_val * 100) if low_15m_val > 0 else 999
                
                logger.info(f"🔍 {pair} DIP-BUY CHECK | Price: ${current_price:.2f} | "
                          f"1h Low: Near={near_low_1h} (L=${low_1h_val:.2f} | Dist: {dist_to_low_1h:+.2f}%) | "
                          f"30m Low: Near={near_low_30m} (L=${low_30m_val:.2f} | Dist: {dist_to_low_30m:+.2f}%) | "
                          f"15m Low: Near={near_low_15m} (L=${low_15m_val:.2f} | Dist: {dist_to_low_15m:+.2f}%) | "
                          f"Vol: {volume_weight:.2f}x | HasVol: {has_volume}")
                
                # STRICT DIP-BUYING STRATEGY: ONLY trade lows (support levels)
                # NO high breakouts - too high risk
                # All entries REQUIRE volume - no exceptions
                
                # Priority 1: 1h low (strongest support)
                if near_low_1h and has_volume:
                    reason = f"Buy dip at 1h low ${lows.get('1h', 0):.2f} with volume"
                # Priority 2: 30m low (good support)
                elif near_low_30m and has_volume:
                    reason = f"Buy dip at 30m low ${lows.get('30m', 0):.2f} with volume"
                # Priority 3: 15m low (quick bounce)
                elif near_low_15m and has_volume:
                    reason = f"Buy dip at 15m low ${lows.get('15m', 0):.2f} with volume"
                # NO HIGH BREAKOUTS - removed for risk management
                
                if reason:
                    logger.info(f"✅ {pair} TRADE SIGNAL TRIGGERED: {reason}")
                    try:
                        success = await self.open_position(pair, 'long', current_price)
                        if success:
                            await self.log('signal', f"🟢 {pair} @ ${current_price:.2f} - {reason}", {})
                        else:
                            # open_position already logged the error, just log that trade signal failed
                            logger.warning(f"⚠️ Trade signal triggered but position open failed for {pair}")
                    except Exception as open_error:
                        logger.error(f"❌ Exception calling open_position for {pair}: {open_error}", exc_info=True)
                        await self.log('error', f"❌ Exception opening position for {pair}: {str(open_error)}", {'error': str(open_error)})
                    
            except Exception as e:
                logger.error(f"❌ Error in multi-timeframe analysis for {pair}: {e}", exc_info=True)
                await self.log('error', f"❌ Error analyzing {pair}: {str(e)}", {'error': str(e), 'error_type': type(e).__name__})
    
    async def calculate_momentum_score(self, pair: str, current_price: float) -> float:
        """Calculate momentum score for multi-timeframe strategy"""
        try:
            # Get recent 1-minute candles for momentum calculation
            end_time = int(datetime.now().timestamp() * 1000)
            start_time = end_time - (10 * 60 * 1000)  # Last 10 minutes
            
            candles = await self.get_candles_cached(pair, '1m', start_time, end_time)
            
            if not candles or len(candles) < 5:
                return 0
            
            # Calculate price momentum
            recent_prices = [float(c['c']) for c in candles[-5:]]  # Last 5 minutes
            older_prices = [float(c['c']) for c in candles[-10:-5]]  # 5-10 minutes ago
            
            if not older_prices:
                return 0
            
            recent_avg = sum(recent_prices) / len(recent_prices)
            older_avg = sum(older_prices) / len(older_prices)
            
            momentum = ((recent_avg - older_avg) / older_avg) * 100
            
            # Apply volatility bonus
            price_changes = [abs(recent_prices[i] - recent_prices[i-1]) / recent_prices[i-1] for i in range(1, len(recent_prices))]
            volatility = sum(price_changes) / len(price_changes) if price_changes else 0
            volatility_bonus = min(volatility * 10, 2)  # Cap at 2x bonus
            
            return momentum * (1 + volatility_bonus)
            
        except Exception as e:
            logger.error(f"Error calculating momentum for {pair}: {e}")
            return 0
    
    async def calculate_volume_weight(self, pair: str, timeframe_volumes: dict) -> float:
        """Calculate volume weight for multi-timeframe strategy"""
        try:
            # Use 15m volume as baseline (since we removed 5m)
            current_volume = timeframe_volumes.get('15m', 0)
            baseline_volume = timeframe_volumes.get('30m', timeframe_volumes.get('1h', current_volume))
            
            if baseline_volume == 0:
                return 1.0
            
            volume_ratio = current_volume / baseline_volume
            return max(0.5, min(3.0, volume_ratio))  # Clamp between 0.5x and 3x
            
        except Exception as e:
            logger.error(f"Error calculating volume weight for {pair}: {e}")
            return 1.0
    
    async def run_momentum_breakout_strategy(self):
        """Momentum Breakout Strategy"""
        if len(self.positions) >= self.strategy['max_positions']:
            await self.log('info', f"⚠️ Max positions reached ({self.strategy['max_positions']})", {})
            return
        
        for pair in self.strategy['pairs']:
            if any(p['symbol'] == pair for p in self.positions):
                continue
            
            if pair not in self.last_prices:
                continue
            
            current_price = self.last_prices[pair]
            
            # Get recent candles
            try:
                end_time = int(datetime.now().timestamp() * 1000)
                start_time = int((datetime.now().timestamp() - 300) * 1000)
                candles = await self.get_candles_cached(pair, '1m', start_time, end_time)
                
                if not candles or len(candles) < 5:
                    continue
                
                # Calculate momentum
                old_price = float(candles[0]['c'])
                momentum = ((current_price - old_price) / old_price) * 100
                
                # Log momentum (only every 30 seconds to avoid spam)
                current_time = datetime.now().timestamp()
                if current_time - self.last_analysis_log_time >= self.market_log_interval:
                    await self.log(
                        'market_data',
                        f"📈 {pair} Momentum: {momentum:+.2f}% | Current: ${current_price:.2f}",
                        {'pair': pair, 'momentum': momentum, 'price': current_price}
                    )
                    self.last_analysis_log_time = current_time
                
                # Entry signals
                if momentum > 2.0:
                    success = await self.open_position(pair, 'long', current_price)
                    if success:
                        await self.log('signal', f"🚀 LONG BREAKOUT: {pair} ({momentum:+.2f}%)", {})
                elif momentum < -2.0:
                    success = await self.open_position(pair, 'short', current_price)
                    if success:
                        await self.log('signal', f"📉 SHORT BREAKOUT: {pair} ({momentum:.2f}%)", {})
                    
            except Exception as e:
                logger.error(f"Error analyzing momentum for {pair}: {e}")
    
    async def run_liquidity_grab_strategy(self):
        """Liquidity Grab Strategy - Buy when price wicks below support then bounces back"""
        # Throttle: Don't run every second - check every 5 seconds to reduce API calls
        current_time = datetime.now().timestamp()
        if current_time - self.last_liquidity_grab_check < self.liquidity_grab_check_interval:
            return  # Skip this tick, wait for next interval
        
        self.last_liquidity_grab_check = current_time
        
        logger.info(f"🎯 Running Liquidity Grab Strategy | Positions: {len(self.positions)}/{self.strategy['max_positions']} | Pairs: {self.strategy['pairs']}")
        
        # Check if max positions reached
        max_positions_reached = len(self.positions) >= self.strategy['max_positions']
        if max_positions_reached:
            return
        
        for pair in self.strategy['pairs']:
            # Skip if already have position
            has_open_position = any(p['symbol'] == pair for p in self.positions)
            if has_open_position:
                continue
            
            try:
                # Get current price
                if pair not in self.last_prices:
                    continue
                current_price = self.last_prices[pair]
                current_time = datetime.now().timestamp()
                
                # Fetch 1h and 30m candles to get support levels
                end_time = int(datetime.now().timestamp() * 1000)
                start_time_1h = end_time - (2 * 60 * 60 * 1000)  # Last 2 hours
                start_time_30m = end_time - (2 * 30 * 60 * 1000)  # Last 1 hour
                
                # Get 1h support level (last closed candle low)
                try:
                    candles_1h = await self.get_candles_cached(pair, '1h', start_time_1h, end_time)
                    if candles_1h and len(candles_1h) > 1:
                        closed_1h = candles_1h[:-1] if len(candles_1h) > 1 else candles_1h
                        if len(closed_1h) > 0:
                            last_closed_1h = closed_1h[-1]
                            support_1h = float(last_closed_1h['l'])
                            avg_volume_1h = sum(float(c['v']) for c in closed_1h) / len(closed_1h) if len(closed_1h) > 0 else 0
                        else:
                            support_1h = None
                            avg_volume_1h = 0
                    else:
                        support_1h = None
                        avg_volume_1h = 0
                except Exception as e:
                    logger.warning(f"Failed to get 1h candles for {pair}: {e}")
                    support_1h = None
                    avg_volume_1h = 0
                
                # Get 30m support level (last closed candle low)
                try:
                    candles_30m = await self.get_candles_cached(pair, '30m', start_time_30m, end_time)
                    if candles_30m and len(candles_30m) > 1:
                        closed_30m = candles_30m[:-1] if len(candles_30m) > 1 else candles_30m
                        if len(closed_30m) > 0:
                            last_closed_30m = closed_30m[-1]
                            support_30m = float(last_closed_30m['l'])
                            avg_volume_30m = sum(float(c['v']) for c in closed_30m) / len(closed_30m) if len(closed_30m) > 0 else 0
                        else:
                            support_30m = None
                            avg_volume_30m = 0
                    else:
                        support_30m = None
                        avg_volume_30m = 0
                except Exception as e:
                    logger.warning(f"Failed to get 30m candles for {pair}: {e}")
                    support_30m = None
                    avg_volume_30m = 0
                
                # Check downtrend filter (skip if bearish 30m candle)
                is_downtrend = False
                try:
                    if candles_30m and len(candles_30m) > 1:
                        last_closed_30m_check = candles_30m[-2] if len(candles_30m) > 1 else candles_30m[-1]
                        candle_close = float(last_closed_30m_check['c'])
                        candle_open = float(last_closed_30m_check['o'])
                        if candle_close < candle_open:
                            is_downtrend = True
                            logger.debug(f"📉 {pair} Downtrend detected: Last 30m candle bearish (O: ${candle_open:.2f} C: ${candle_close:.2f})")
                except Exception as e:
                    logger.debug(f"Failed to check downtrend for {pair}: {e}")
                
                if is_downtrend:
                    # Log this occasionally so we know why trades aren't happening
                    if current_time - self.last_analysis_log_time >= self.market_log_interval:
                        await self.log(
                            'market_data',
                            f"⏸️ {pair} Skipping liquidity grab - Market in downtrend (30m candle bearish)",
                            {'pair': pair, 'support_1h': support_1h, 'support_30m': support_30m, 'current_price': current_price}
                        )
                        self.last_analysis_log_time = current_time
                    continue
                
                # Get current volume (from 15m candles)
                try:
                    start_time_15m = end_time - (15 * 60 * 1000)  # Last 15 minutes
                    candles_15m = await self.get_candles_cached(pair, '15m', start_time_15m, end_time)
                    if candles_15m and len(candles_15m) > 0:
                        current_volume = float(candles_15m[-1]['v']) if candles_15m else 0
                    else:
                        current_volume = 0
                except Exception as e:
                    logger.debug(f"Failed to get current volume for {pair}: {e}")
                    current_volume = 0
                
                # Use average volume from 30m or 1h as baseline
                avg_volume = avg_volume_30m if avg_volume_30m > 0 else avg_volume_1h
                
                # Detect Wick Below Support (with wiggle room - within 0.1% counts as a wick)
                wick_event = self.liquidity_grab_events.get(pair)
                wick_threshold = 0.001  # 0.1% wiggle room for wick detection
                
                # Log market metrics when not in downtrend (every 30 seconds)
                if current_time - self.last_analysis_log_time >= self.market_log_interval:
                    support_info = []
                    if support_1h:
                        dist_1h = ((current_price - support_1h) / support_1h) * 100
                        support_info.append(f"1h: ${support_1h:.2f} ({dist_1h:+.2f}%)")
                    if support_30m:
                        dist_30m = ((current_price - support_30m) / support_30m) * 100
                        support_info.append(f"30m: ${support_30m:.2f} ({dist_30m:+.2f}%)")
                    
                    wick_status = "Monitoring wick" if wick_event else "No wick detected"
                    support_str = " | ".join(support_info) if support_info else "No support levels"
                    
                    await self.log(
                        'market_data',
                        f"📊 {pair} @ ${current_price:.2f} | {support_str} | {wick_status}",
                        {
                            'pair': pair,
                            'current_price': current_price,
                            'support_1h': support_1h,
                            'support_30m': support_30m,
                            'has_wick_event': bool(wick_event)
                        }
                    )
                    self.last_analysis_log_time = current_time
                
                # Check 1h support first (priority)
                if support_1h and current_price <= support_1h * (1 + wick_threshold):
                    # Price wicked below or near 1h support (within 0.1%)
                    if not wick_event or wick_event.get('support_level') != support_1h:
                        # New wick event or support level changed
                        self.liquidity_grab_events[pair] = {
                            'wick_time': current_time,
                            'support_level': support_1h,
                            'support_tf': '1h',
                            'wick_price': current_price
                        }
                        logger.info(f"🔻 {pair} Liquidity grab detected: Price wicked below/near 1h support ${support_1h:.2f} @ ${current_price:.2f} (within 0.1%)")
                # Check 30m support if no 1h wick
                elif support_30m and current_price <= support_30m * (1 + wick_threshold):
                    # Price wicked below or near 30m support (within 0.1%)
                    if not wick_event or wick_event.get('support_level') != support_30m:
                        # New wick event or support level changed
                        self.liquidity_grab_events[pair] = {
                            'wick_time': current_time,
                            'support_level': support_30m,
                            'support_tf': '30m',
                            'wick_price': current_price
                        }
                        logger.info(f"🔻 {pair} Liquidity grab detected: Price wicked below/near 30m support ${support_30m:.2f} @ ${current_price:.2f} (within 0.1%)")
                
                # Detect Bounce Back
                if wick_event:
                    support_level = wick_event['support_level']
                    support_tf = wick_event['support_tf']
                    wick_time = wick_event['wick_time']
                    wick_price = wick_event.get('wick_price', current_price)
                    time_since_wick = current_time - wick_time
                    
                    # Calculate price recovery from wick low
                    price_recovery = ((current_price - wick_price) / wick_price) * 100 if wick_price > 0 else 0
                    
                    # Relaxed bounce condition: Price recovered to within 0.2% of support (or above)
                    bounce_threshold = 0.002  # 0.2% threshold
                    price_near_support = current_price >= support_level * (1 - bounce_threshold)
                    
                    # Log wick event status for debugging
                    if time_since_wick <= 30:  # Log every 30 seconds when monitoring a wick event
                        logger.debug(f"🔍 {pair} Monitoring wick: Support ${support_level:.2f} ({support_tf}) | Current ${current_price:.2f} | Recovery: {price_recovery:+.2f}% | Time: {int(time_since_wick)}s")
                    
                    # Check if price recovered to near/above support
                    if price_near_support:
                        # Check if bounce happened within timeout window
                        if time_since_wick <= self.liquidity_grab_timeout:
                            # Check volume confirmation (lowered to 1.0x - just average volume)
                            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 0
                            
                            # More lenient: require at least 0.8x volume (below average is OK if price recovered well)
                            if volume_ratio >= 0.8 or price_recovery >= 0.1:  # Either decent volume OR price recovered 0.1%+
                                # TRADE SIGNAL: Open LONG position
                                reason = f"Liquidity grab bounce at {support_tf} support ${support_level:.2f} (recovery: {price_recovery:+.2f}%)"
                                logger.info(f"✅ {pair} LIQUIDITY GRAB BOUNCE: {reason} | Volume: {volume_ratio:.2f}x | Recovery: {price_recovery:+.2f}%")
                                
                                try:
                                    success = await self.open_position(pair, 'long', current_price)
                                    if success:
                                        await self.log('signal', f"🟢 {pair} @ ${current_price:.2f} - {reason}", {})
                                        # Clear the wick event to prevent duplicate trades
                                        del self.liquidity_grab_events[pair]
                                    else:
                                        logger.warning(f"⚠️ Liquidity grab signal triggered but position open failed for {pair}")
                                except Exception as open_error:
                                    logger.error(f"❌ Exception calling open_position for {pair}: {open_error}", exc_info=True)
                                    await self.log('error', f"❌ Exception opening position for {pair}: {str(open_error)}", {'error': str(open_error)})
                            else:
                                logger.debug(f"📊 {pair} Recovered to support but volume low ({volume_ratio:.2f}x) and recovery weak ({price_recovery:+.2f}%)")
                        else:
                            # Timeout exceeded - cleanup
                            logger.debug(f"⏱️ {pair} Liquidity grab expired - no bounce within 10min")
                            del self.liquidity_grab_events[pair]
                    else:
                        # Still below support, check if timeout exceeded
                        if time_since_wick > self.liquidity_grab_timeout:
                            logger.debug(f"⏱️ {pair} Liquidity grab expired - no bounce within 10min")
                            del self.liquidity_grab_events[pair]
                
            except Exception as e:
                logger.error(f"❌ Error in liquidity grab analysis for {pair}: {e}", exc_info=True)
                await self.log('error', f"❌ Error analyzing liquidity grab for {pair}: {str(e)}", {'error': str(e), 'error_type': type(e).__name__})
    
    async def run_support_liquidity_strategy(self):
        """Support Liquidity Strategy - Buy at support levels when liquidity flow is positive"""
        # Throttle: Check every 5 seconds to reduce API calls
        current_time = datetime.now().timestamp()
        if not hasattr(self, 'last_support_liquidity_check'):
            self.last_support_liquidity_check = 0
        
        if current_time - self.last_support_liquidity_check < 5:
            return  # Skip this tick, wait for next interval
        
        self.last_support_liquidity_check = current_time
        
        logger.info(f"🎯 Running Support Liquidity Strategy | Positions: {len(self.positions)}/{self.strategy['max_positions']} | Pairs: {self.strategy['pairs']}")
        
        # Check if max positions reached
        max_positions_reached = len(self.positions) >= self.strategy['max_positions']
        if max_positions_reached:
            return
        
        for pair in self.strategy['pairs']:
            # Skip if already have position
            has_open_position = any(p['symbol'] == pair for p in self.positions)
            if has_open_position:
                continue
            
            try:
                # Get current price
                if pair not in self.last_prices:
                    continue
                current_price = self.last_prices[pair]
                
                # 1. FETCH LEVELS FROM SCANNER_LEVELS TABLE
                scanner_levels_data = None
                try:
                    result = supabase.table('scanner_levels')\
                        .select('*')\
                        .eq('symbol', pair)\
                        .execute()
                    
                    if result.data and len(result.data) > 0:
                        scanner_levels_data = result.data[0]
                        logger.debug(f"✅ Fetched scanner levels for {pair} from Supabase")
                    else:
                        logger.debug(f"⚠️ No scanner levels data found for {pair} in Supabase")
                except Exception as e:
                    logger.warning(f"❌ Failed to fetch scanner levels for {pair}: {e}")
                    scanner_levels_data = None
                
                # Parse levels data
                support_level = None
                resistance_level = None
                closest_level = None
                all_levels_by_timeframe = {}
                
                if scanner_levels_data:
                    try:
                        if scanner_levels_data.get('support'):
                            support_data = scanner_levels_data['support']
                            if isinstance(support_data, dict):
                                support_level = {
                                    'price': float(support_data.get('price', 0)),
                                    'timeframe': support_data.get('timeframe', 'unknown'),
                                    'touches': support_data.get('touches', 1),
                                    'weight': support_data.get('weight', 1)
                                }
                        
                        if scanner_levels_data.get('resistance'):
                            resistance_data = scanner_levels_data['resistance']
                            if isinstance(resistance_data, dict):
                                resistance_level = {
                                    'price': float(resistance_data.get('price', 0)),
                                    'timeframe': resistance_data.get('timeframe', 'unknown'),
                                    'touches': resistance_data.get('touches', 1),
                                    'weight': resistance_data.get('weight', 1)
                                }
                        
                        if scanner_levels_data.get('closest_level'):
                            closest_data = scanner_levels_data['closest_level']
                            if isinstance(closest_data, dict):
                                closest_level = {
                                    'price': float(closest_data.get('price', 0)),
                                    'timeframe': closest_data.get('timeframe', 'unknown'),
                                    'type': closest_data.get('type', 'unknown'),
                                    'distance': float(closest_data.get('distance', 999))
                                }
                        
                        if scanner_levels_data.get('all_levels_by_timeframe'):
                            all_levels_by_timeframe = scanner_levels_data['all_levels_by_timeframe']
                    except Exception as e:
                        logger.warning(f"❌ Error parsing scanner levels data for {pair}: {e}")
                
                # 2. CALCULATE NET FLOW FROM RECENT TRADES (like scanner does)
                liquidity_flow = None
                net_flow = 0
                buy_volume = 0
                sell_volume = 0
                flow_ratio = 0.5
                
                try:
                    # Fetch recent trades using HTTP API (more reliable than SDK method)
                    try:
                        response = requests.post(
                            HYPERLIQUID_API_URL,
                            headers={'Content-Type': 'application/json'},
                            json={'type': 'recentTrades', 'coin': pair},
                            timeout=5
                        )
                        
                        if response.ok:
                            recent_trades = response.json()
                            logger.debug(f"✅ Fetched {len(recent_trades) if isinstance(recent_trades, list) else 0} recent trades for {pair}")
                        else:
                            logger.warning(f"⚠️ Recent trades API returned HTTP {response.status_code} for {pair}")
                            recent_trades = None
                    except Exception as api_error:
                        logger.warning(f"⚠️ Failed to fetch recent trades via HTTP API for {pair}: {api_error}")
                        # Fallback: try SDK method
                        try:
                            recent_trades = info.recent_trades({'coin': pair})
                            logger.debug(f"✅ Fetched trades via SDK for {pair}")
                        except Exception as sdk_error:
                            logger.warning(f"⚠️ SDK method also failed for {pair}: {sdk_error}")
                            recent_trades = None
                    
                    if recent_trades and isinstance(recent_trades, list) and len(recent_trades) > 0:
                        # Calculate net flow from trades
                        # 'B' = bid (buy), 'A' = ask (sell)
                        trade_count = 0
                        for trade in recent_trades[:100]:  # Use last 100 trades
                            try:
                                # Handle both dict and object formats
                                if isinstance(trade, dict):
                                    price = float(trade.get('px', 0))
                                    size = float(trade.get('sz', 0))
                                    side = trade.get('side', 'B')
                                else:
                                    price = float(getattr(trade, 'px', 0))
                                    size = float(getattr(trade, 'sz', 0))
                                    side = getattr(trade, 'side', 'B')
                                
                                if price > 0 and size > 0:
                                    volume = price * size
                                    trade_count += 1
                                    
                                    if side == 'B':  # Bid = buy
                                        buy_volume += volume
                                    elif side == 'A':  # Ask = sell
                                        sell_volume += volume
                            except Exception as trade_error:
                                logger.debug(f"Error processing trade for {pair}: {trade_error}")
                                continue
                        
                        total_volume = buy_volume + sell_volume
                        if total_volume > 0:
                            net_flow = buy_volume - sell_volume  # Positive = buying pressure
                            flow_ratio = buy_volume / total_volume  # >0.5 = bullish
                            
                            liquidity_flow = {
                                'net_flow': net_flow,
                                'buy_volume': buy_volume,
                                'sell_volume': sell_volume,
                                'flow_ratio': flow_ratio,
                                'is_bullish': net_flow > 0  # Positive net flow = bullish
                            }
                            logger.debug(f"✅ Calculated flow for {pair}: net_flow=${net_flow/1_000:.2f}K, buy=${buy_volume/1_000:.2f}K, sell=${sell_volume/1_000:.2f}K, ratio={flow_ratio*100:.1f}%")
                        else:
                            logger.debug(f"⚠️ No valid trades found for {pair} (processed {trade_count} trades)")
                    else:
                        logger.debug(f"⚠️ No recent trades data for {pair} (response type: {type(recent_trades)})")
                except Exception as e:
                    logger.warning(f"❌ Failed to calculate net flow from trades for {pair}: {e}", exc_info=True)
                
                # 3. LOG MARKET DATA (every 30 seconds) - UPDATE IN PLACE
                # Use per-pair timer to ensure each pair updates independently
                last_pair_update = self.last_market_metrics_update_time.get(pair, 0)
                if current_time - last_pair_update >= self.market_log_interval:
                    # Build log message with all data
                    log_parts = [f"📊 {pair} @ ${current_price:.2f}"]
                    
                    # Add support level info
                    if support_level:
                        support_dist = ((current_price - support_level['price']) / support_level['price']) * 100
                        log_parts.append(f"Support: ${support_level['price']:.2f} ({support_dist:+.2f}%) [{support_level['timeframe']}, {support_level['touches']} touches]")
                    else:
                        log_parts.append("Support: N/A")
                    
                    # Add resistance level info
                    if resistance_level:
                        resistance_dist = ((resistance_level['price'] - current_price) / current_price) * 100
                        log_parts.append(f"Resistance: ${resistance_level['price']:.2f} ({resistance_dist:+.2f}%) [{resistance_level['timeframe']}, {resistance_level['touches']} touches]")
                    else:
                        log_parts.append("Resistance: N/A")
                    
                    # Add closest level info
                    if closest_level:
                        log_parts.append(f"Closest: ${closest_level['price']:.2f} ({closest_level['type']}, {closest_level['distance']:.2f}% away)")
                    
                    # Add liquidity flow info
                    if liquidity_flow:
                        flow_emoji = "🟢" if liquidity_flow['is_bullish'] else "🔴"
                        buy_vol = liquidity_flow.get('buy_volume', 0)
                        sell_vol = liquidity_flow.get('sell_volume', 0)
                        log_parts.append(f"{flow_emoji} Flow: ${net_flow/1_000:.2f}K net (Buy: ${buy_vol/1_000:.2f}K, Sell: ${sell_vol/1_000:.2f}K, Ratio: {flow_ratio*100:.1f}%)")
                    else:
                        log_parts.append("Flow: N/A")
                    
                    log_message = " | ".join(log_parts)
                    
                    # Use log_update to update in place instead of creating new log entries
                    await self.log_update(
                        'market_metrics',
                        pair,
                        log_message,
                        {
                            'pair': pair,
                            'current_price': current_price,
                            'support_level': support_level,
                            'resistance_level': resistance_level,
                            'closest_level': closest_level,
                            'liquidity_flow': liquidity_flow,
                            'all_levels_by_timeframe': all_levels_by_timeframe
                        }
                    )
                    self.last_market_metrics_update_time[pair] = current_time
                
                # 4. CHECK ENTRY CONDITIONS
                # Entry: Price touches support AND liquidity flow is positive
                # Log debug info about why trades aren't happening
                if not support_level:
                    logger.debug(f"📊 {pair} No support level data from scanner - cannot trade")
                elif not liquidity_flow:
                    logger.debug(f"📊 {pair} Has support level but no liquidity flow data available - cannot trade")
                elif support_level and liquidity_flow:
                    support_price = support_level['price']
                    # Check if price is near support (within 0.15%)
                    support_distance_pct = abs(current_price - support_price) / support_price * 100
                    support_touch_threshold = 0.15  # 0.15% wiggle room - tighter entries
                    
                    # Log why trade isn't happening
                    if support_distance_pct > support_touch_threshold:
                        logger.debug(f"📊 {pair} Support at ${support_price:.2f} but price too far: {support_distance_pct:.2f}% away (threshold: {support_touch_threshold}%)")
                    elif not liquidity_flow['is_bullish']:
                        logger.debug(f"📊 {pair} At support ${support_price:.2f} but flow is bearish (net_flow=${net_flow/1_000:.2f}K, ratio={flow_ratio*100:.1f}%)")
                    else:
                        # Price is near support AND flow is bullish - check final conditions
                        is_price_above_support = current_price >= support_price * 0.9985  # Within 0.15% above support
                        is_positive_flow = net_flow > 0  # Positive net flow = buying pressure
                        
                        if is_price_above_support and is_positive_flow:
                            # TRADE SIGNAL: Open LONG position
                            reason = f"Support bounce at ${support_price:.2f} ({support_level['timeframe']}, {support_level['touches']} touches) with bullish flow (${net_flow/1_000:.2f}K net, {flow_ratio*100:.1f}% buy)"
                            logger.info(f"✅ {pair} SUPPORT LIQUIDITY SIGNAL: {reason}")
                            
                            try:
                                success = await self.open_position(pair, 'long', current_price)
                                if success:
                                    await self.log('signal', f"🟢 {pair} @ ${current_price:.2f} - {reason}", {
                                        'support_price': support_price,
                                        'support_timeframe': support_level['timeframe'],
                                        'support_touches': support_level['touches'],
                                        'net_flow': net_flow,
                                        'flow_ratio': flow_ratio
                                    })
                                else:
                                    logger.warning(f"⚠️ Support liquidity signal triggered but position open failed for {pair}")
                            except Exception as open_error:
                                logger.error(f"❌ Exception calling open_position for {pair}: {open_error}", exc_info=True)
                                await self.log('error', f"❌ Exception opening position for {pair}: {str(open_error)}", {'error': str(open_error)})
                        else:
                            logger.debug(f"📊 {pair} Near support but conditions not met: price_above={is_price_above_support} (price=${current_price:.2f}, support=${support_price:.2f}), positive_flow={is_positive_flow} (net_flow=${net_flow/1_000:.2f}K, ratio={flow_ratio*100:.1f}%)")
                
            except Exception as e:
                logger.error(f"❌ Error in support liquidity analysis for {pair}: {e}", exc_info=True)
                await self.log('error', f"❌ Error analyzing support liquidity for {pair}: {str(e)}", {'error': str(e), 'error_type': type(e).__name__})
    
    async def run_default_strategy(self):
        """Default strategy (for testing)"""
        await self.log('info', f"🤖 Running default strategy for {len(self.strategy['pairs'])} pairs", {})
    
    async def open_position(self, pair: str, side: str, price: float) -> bool:
        """Open a new position - returns True if successful, False otherwise"""
        try:
            position_size_usd = self.strategy['position_size']  # Position size in USD
            stop_loss_pct = self.strategy['stop_loss_percent']
            take_profit_pct = self.strategy['take_profit_percent']
            
            # CRITICAL: Convert USD position size to units (size = USD / price)
            # position_size is in dollars, but 'size' field should be in units
            position_size_units = position_size_usd / price if price > 0 else 0
            
            logger.info(f"💰 Position size: ${position_size_usd:.2f} USD = {position_size_units:.6f} {pair} units @ ${price:.2f}")
            
            # Calculate SL/TP
            if side == 'long':
                stop_loss = price * (1 - stop_loss_pct / 100)
                take_profit = price * (1 + take_profit_pct / 100)
            else:
                stop_loss = price * (1 + stop_loss_pct / 100)
                take_profit = price * (1 - take_profit_pct / 100)
            
            # Insert position
            position_id = str(uuid.uuid4())  # Generate ID for position
            position_data = {
                'id': position_id,
                'bot_id': self.bot_id,
                'symbol': pair,
                'side': side,
                'size': position_size_units,  # Store as units, not USD!
                'entry_price': price,
                'current_price': price,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'opened_at': datetime.now().isoformat(),
                'status': 'open'
            }
            
            logger.info(f"📝 Inserting position for {pair} {side} @ ${price:.2f}")
            try:
                result = supabase.table('bot_positions').insert(position_data).execute()
                
                # Log result structure for debugging
                logger.debug(f"Insert result: type={type(result)}, dir={[x for x in dir(result) if not x.startswith('_')]}")
                if hasattr(result, 'data'):
                    logger.debug(f"Result.data: {result.data}")
                if hasattr(result, 'error'):
                    logger.debug(f"Result.error: {result.error}")
                
            except Exception as e:
                # Supabase Python client raises exceptions for errors
                error_str = str(e)
                error_type = type(e).__name__
                logger.error(f"❌ Exception inserting position: {error_type}: {error_str}", exc_info=True)
                
                # Try to extract error message from exception - be careful with attribute access
                error_msg = error_str  # Default to string representation
                try:
                    if hasattr(e, 'message') and e.message:
                        error_msg = str(e.message)
                    elif hasattr(e, 'args') and len(e.args) > 0:
                        error_msg = str(e.args[0])
                    elif hasattr(e, '__dict__'):
                        # Check if error has a message in its dict
                        if 'message' in e.__dict__:
                            error_msg = str(e.__dict__['message'])
                except Exception as extract_error:
                    logger.error(f"❌ Error extracting error message: {extract_error}")
                    error_msg = error_str
                
                try:
                    await self.log('error', f"❌ Exception inserting position for {pair}: {error_msg}", {
                        'error': error_msg,
                        'error_type': error_type,
                        'full_error': error_str
                    })
                except Exception as log_error:
                    logger.error(f"❌ Failed to log error: {log_error}")
                
                return False
            
            # Check for Supabase errors in result object
            if hasattr(result, 'error') and result.error:
                # Handle different error formats
                if isinstance(result.error, dict):
                    error_msg = result.error.get('message', str(result.error))
                elif isinstance(result.error, str):
                    error_msg = result.error
                else:
                    error_msg = str(result.error)
                logger.error(f"❌ Supabase error inserting position: {error_msg} | Full result: {result}")
                await self.log('error', f"❌ Failed to insert position for {pair}: {error_msg}", {'error': error_msg, 'full_result': str(result)})
                return False
            
            # Check if result is actually an error dict
            if isinstance(result, dict) and 'message' in result:
                error_msg = result.get('message', 'Unknown error')
                logger.error(f"❌ Supabase returned error dict: {error_msg} | Full result: {result}")
                await self.log('error', f"❌ Failed to insert position for {pair}: {error_msg}", {'error': error_msg, 'full_result': str(result)})
                return False
            
            if not hasattr(result, 'data') or not result.data or len(result.data) == 0:
                error_msg = f"No data returned from insert. Result type: {type(result)}, Result: {result}"
                logger.error(f"❌ Position insert returned no data for {pair}: {error_msg}")
                await self.log('error', f"❌ Failed to insert position for {pair} - No data returned", {'result': str(result), 'result_type': str(type(result))})
                return False
            
            # Verify the insert succeeded (we already have position_id from generation)
            logger.info(f"✅ Position inserted: {position_id}")
            
            # Insert trade
            trade_id = str(uuid.uuid4())  # Generate ID for trade
            trade_data = {
                'id': trade_id,
                'bot_id': self.bot_id,
                'position_id': position_id,
                'symbol': pair,
                'side': 'buy' if side == 'long' else 'sell',
                'size': position_size_units,  # Use units, not USD
                'price': price,
                'executed_at': datetime.now().isoformat(),
                'mode': self.mode
            }
            
            logger.info(f"📝 Inserting trade for {pair} {side} @ ${price:.2f}")
            try:
                trade_result = supabase.table('bot_trades').insert(trade_data).execute()
            except Exception as e:
                logger.error(f"❌ Exception inserting trade: {e}", exc_info=True)
                await self.log('error', f"❌ Exception inserting trade for {pair}: {str(e)}", {'error': str(e)})
                return False
            
            # Check for Supabase errors
            if hasattr(trade_result, 'error') and trade_result.error:
                error_msg = str(trade_result.error) if trade_result.error else "Unknown error"
                logger.error(f"❌ Supabase error inserting trade: {error_msg}")
                await self.log('error', f"❌ Failed to insert trade for {pair}: {error_msg}", {'error': error_msg})
                return False
            
            if not hasattr(trade_result, 'data') or not trade_result.data or len(trade_result.data) == 0:
                error_msg = f"No data returned from trade insert. Result type: {type(trade_result)}, Result: {trade_result}"
                logger.error(f"❌ Trade insert returned no data for {pair}: {error_msg}")
                await self.log('error', f"❌ Failed to insert trade for {pair} - No data returned", {'result': str(trade_result)})
                return False
            
            logger.info(f"✅ Trade inserted successfully")
            
            # CRITICAL: Update self.positions immediately so next tick doesn't open duplicate
            self.positions.append({
                'id': position_id,
                'symbol': pair,
                'side': side,
                'size': position_size_units,
                'entry_price': price,
                'current_price': price,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'status': 'open'
            })
            logger.info(f"✅ Updated positions list: {len(self.positions)} positions")
            
            # Initialize position metadata for risk management
            self.position_metadata[position_id] = {
                'highest_profit_pct': 0.0,
                'highest_profit_price': price,
                'first_profit_time': None,
                'original_stop_loss': stop_loss
            }
            logger.debug(f"📊 Initialized metadata for position {position_id}")
            
            # Delete monitoring log since we now have a position
            if pair in self.monitoring_log_ids:
                try:
                    supabase.table('bot_logs').delete().eq('id', self.monitoring_log_ids[pair]).execute()
                    del self.monitoring_log_ids[pair]
                except Exception as e:
                    logger.warning(f"Failed to delete monitoring log for {pair}: {e}")
            
            await self.log(
                'trade',
                f"✅ Opened {side.upper()} {pair} @ ${price:.2f} | SL: ${stop_loss:.2f} | TP: ${take_profit:.2f}",
                {'position_id': position_id, 'side': side, 'price': price}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ CRITICAL ERROR opening position for {pair}: {e}", exc_info=True)
            await self.log('error', f"❌ Failed to open position for {pair}: {str(e)}", {'error': str(e)})
            return False
    
    async def check_positions(self):
        """Check and manage open positions"""
        # Refresh positions from database to get latest data (including updated unrealized_pnl)
        try:
            result = supabase.table('bot_positions')\
                .select('*')\
                .eq('bot_id', self.bot_id)\
                .eq('status', 'open')\
                .execute()
            
            if result.data:
                # Preserve metadata for existing positions
                old_positions = {p['id']: p for p in self.positions}
                # Update self.positions with fresh data from database
                self.positions = result.data
                # Initialize metadata for any new positions that don't have it
                for pos in self.positions:
                    pos_id = pos['id']
                    if pos_id not in self.position_metadata:
                        # New position from database - initialize metadata
                        self.position_metadata[pos_id] = {
                            'highest_profit_pct': 0.0,
                            'highest_profit_price': pos.get('entry_price', 0),
                            'first_profit_time': None,
                            'original_stop_loss': pos.get('stop_loss', 0)
                        }
                        logger.debug(f"📊 Initialized metadata for existing position {pos_id}")
        except Exception as e:
            logger.warning(f"Failed to refresh positions from database: {e}")
            # Continue with existing self.positions if refresh fails
        
        for position in self.positions:
            pair = position['symbol']
            
            if pair not in self.last_prices:
                continue
            
            current_price = self.last_prices[pair]
            entry_price = position['entry_price']
            side = position['side']
            
            # Calculate P&L
            if side == 'long':
                pnl = (current_price - entry_price) * position['size']
            else:
                pnl = (entry_price - current_price) * position['size']
            
            pnl_pct = (pnl / (entry_price * position['size'])) * 100
            
            # Update position in database
            supabase.table('bot_positions')\
                .update({'current_price': current_price, 'unrealized_pnl': pnl})\
                .eq('id', position['id'])\
                .execute()
            
            # Update position status log in place (every 5 seconds)
            current_time = datetime.now().timestamp()
            last_update = self.last_position_update_time.get(pair, 0)
            
            if current_time - last_update >= 5:  # Update every 5 seconds
                emoji = '💚' if pnl >= 0 else '❤️'
                stop_loss = position.get('stop_loss')
                take_profit = position.get('take_profit')
                
                # Format TP/SL info
                tp_str = f"TP: ${take_profit:.2f}" if take_profit else "TP: N/A"
                sl_str = f"SL: ${stop_loss:.2f}" if stop_loss else "SL: N/A"
                
                message = f"📊 {emoji} {side.upper()} {pair} | Entry: ${entry_price:.2f} → ${current_price:.2f} | {tp_str} | {sl_str} | P&L: ${pnl:.2f} ({pnl_pct:+.2f}%)"
                data = {
                    'position_id': position['id'],
                    'pnl': pnl,
                    'pnl_pct': pnl_pct,
                    'entry_price': entry_price,
                    'current_price': current_price,
                    'stop_loss': stop_loss,
                    'take_profit': take_profit,
                    'update_type': 'position_status'
                }
                
                await self.log_update('position_status', pair, message, data)
                self.last_position_update_time[pair] = current_time
            
            # Get or initialize position metadata
            position_id = position['id']
            if position_id not in self.position_metadata:
                self.position_metadata[position_id] = {
                    'highest_profit_pct': 0.0,
                    'highest_profit_price': entry_price,
                    'first_profit_time': None,
                    'original_stop_loss': position.get('stop_loss', 0)
                }
            
            metadata = self.position_metadata[position_id]
            
            # Update highest profit tracking
            if pnl_pct > metadata['highest_profit_pct']:
                metadata['highest_profit_pct'] = pnl_pct
                metadata['highest_profit_price'] = current_price
                logger.debug(f"📈 {pair} new peak profit: {pnl_pct:+.2f}% @ ${current_price:.2f}")
            
            # Track when position first enters profit
            if pnl_pct > 0 and metadata['first_profit_time'] is None:
                metadata['first_profit_time'] = current_time
                logger.debug(f"💰 {pair} entered profit for first time")
            
            # Calculate time in profit (in minutes)
            time_in_profit = 0
            if metadata['first_profit_time'] is not None and pnl_pct > 0:
                time_in_profit = (current_time - metadata['first_profit_time']) / 60
            
            # Get current stop_loss and take_profit
            stop_loss = position.get('stop_loss')
            take_profit = position.get('take_profit')
            
            # Apply risk management: Break-even protection only
            # Move SL to entry_price when profit >= 0.15% to protect against losses
            if side == 'long' and pnl_pct >= 0.15 and stop_loss and stop_loss < entry_price:
                new_sl = entry_price
                if abs(new_sl - stop_loss) > 0.0001:  # Only update if significantly different
                    try:
                        supabase.table('bot_positions')\
                            .update({'stop_loss': new_sl})\
                            .eq('id', position_id)\
                            .execute()
                        position['stop_loss'] = new_sl  # Update local copy
                        stop_loss = new_sl
                        logger.info(f"🛡️ {pair} Break-even protection: Moved SL to entry ${entry_price:.2f}")
                    except Exception as e:
                        logger.error(f"❌ Failed to update break-even SL for {pair}: {e}")
            elif side == 'short' and pnl_pct >= 0.15 and stop_loss and stop_loss > entry_price:
                new_sl = entry_price
                if abs(new_sl - stop_loss) > 0.0001:
                    try:
                        supabase.table('bot_positions')\
                            .update({'stop_loss': new_sl})\
                            .eq('id', position_id)\
                            .execute()
                        position['stop_loss'] = new_sl
                        stop_loss = new_sl
                        logger.info(f"🛡️ {pair} Break-even protection: Moved SL to entry ${entry_price:.2f}")
                    except Exception as e:
                        logger.error(f"❌ Failed to update break-even SL for {pair}: {e}")
            
            # Standard TP/SL Checks (original logic - let winners run to TP)
            should_close = False
            reason = ''
            
            if side == 'long':
                distance_to_tp = ((take_profit - current_price) / current_price * 100) if take_profit else None
                distance_to_sl = ((current_price - stop_loss) / current_price * 100) if stop_loss else None
                logger.debug(f"🔍 {pair} LONG | Price: ${current_price:.2f} | TP: ${take_profit:.2f} ({distance_to_tp:+.2f}% away) | SL: ${stop_loss:.2f} ({distance_to_sl:+.2f}% away)")
                
                if stop_loss and current_price <= stop_loss:
                    should_close = True
                    reason = 'Stop Loss'
                elif take_profit and current_price >= take_profit:
                    should_close = True
                    reason = 'Take Profit'
            else:  # short
                distance_to_tp = ((current_price - take_profit) / current_price * 100) if take_profit else None
                distance_to_sl = ((stop_loss - current_price) / current_price * 100) if stop_loss else None
                logger.debug(f"🔍 {pair} SHORT | Price: ${current_price:.2f} | TP: ${take_profit:.2f} ({distance_to_tp:+.2f}% away) | SL: ${stop_loss:.2f} ({distance_to_sl:+.2f}% away)")
                
                if stop_loss and current_price >= stop_loss:
                    should_close = True
                    reason = 'Stop Loss'
                elif take_profit and current_price <= take_profit:
                    should_close = True
                    reason = 'Take Profit'
            
            # Close position if any exit condition is met
            if should_close:
                logger.info(f"🎯 CLOSING {pair} {side.upper()} @ ${current_price:.2f} - {reason} | Entry: ${entry_price:.2f} | P&L: ${pnl:.2f} ({pnl_pct:+.2f}%)")
                await self.close_position(position, current_price, reason)
            elif not stop_loss or not take_profit:
                logger.warning(f"⚠️ {pair} position missing SL/TP: SL={stop_loss}, TP={take_profit}")
    
    async def close_position(self, position: dict, close_price: float, reason: str):
        """Close a position"""
        try:
            side = position['side']
            pnl = (close_price - position['entry_price']) * position['size'] if side == 'long' else (position['entry_price'] - close_price) * position['size']
            pnl_pct = (pnl / (position['entry_price'] * position['size'])) * 100
            
            logger.info(f"📝 Closing position {position['id']} for {position['symbol']} @ ${close_price:.2f} ({reason})")
            
            # Update position in database
            try:
                supabase.table('bot_positions')\
                    .update({
                        'status': 'closed', 
                        'current_price': close_price, 
                        'closed_at': datetime.now().isoformat(),
                        'unrealized_pnl': pnl
                    })\
                    .eq('id', position['id'])\
                    .execute()
                logger.info(f"✅ Position updated in database")
            except Exception as e:
                logger.error(f"❌ Failed to update position: {e}", exc_info=True)
                return
            
            # Insert closing trade
            trade_id = str(uuid.uuid4())
            try:
                supabase.table('bot_trades').insert({
                    'id': trade_id,
                    'bot_id': self.bot_id,
                    'position_id': position['id'],
                    'symbol': position['symbol'],
                    'side': 'sell' if side == 'long' else 'buy',
                    'size': position['size'],
                    'price': close_price,
                    'pnl': pnl,
                    'executed_at': datetime.now().isoformat(),
                    'mode': self.mode
                }).execute()
                logger.info(f"✅ Closing trade inserted: {trade_id}")
            except Exception as e:
                logger.error(f"❌ Failed to insert closing trade: {e}", exc_info=True)
                return
            
            # CRITICAL: Remove from self.positions so we don't keep checking it
            self.positions = [p for p in self.positions if p['id'] != position['id']]
            logger.info(f"✅ Removed position from list. Remaining: {len(self.positions)}")
            
            # Clean up position metadata
            position_id = position['id']
            if position_id in self.position_metadata:
                del self.position_metadata[position_id]
                logger.debug(f"🧹 Cleaned up metadata for position {position_id}")
            
            # Clean up liquidity grab events for this pair
            pair = position['symbol']
            if pair in self.liquidity_grab_events:
                del self.liquidity_grab_events[pair]
                logger.debug(f"🧹 Cleaned up liquidity grab event for {pair}")
            
            # Clean up orderbook v2 tracking for this pair
            if pair in self.orderbook_v2_position_open_time:
                del self.orderbook_v2_position_open_time[pair]
                logger.debug(f"🧹 Cleaned up orderbook v2 position tracking for {pair}")
            
            # Delete the position status log (it will be replaced with monitoring log)
            if pair in self.position_log_ids:
                try:
                    supabase.table('bot_logs').delete().eq('id', self.position_log_ids[pair]).execute()
                    del self.position_log_ids[pair]
                except Exception as e:
                    logger.warning(f"Failed to delete position log for {pair}: {e}")
            
            # Clear position update time
            if pair in self.last_position_update_time:
                del self.last_position_update_time[pair]
            
            # Record close time for cooldown period
            self.last_position_close_time[pair] = datetime.now().timestamp()
            logger.info(f"⏸️ {pair} cooldown started - will wait {self.position_cooldown}s before next trade")
            
            await self.log(
                'trade',
                f"🔴 Closed {side.upper()} {position['symbol']} @ ${close_price:.2f} ({reason}) | Entry: ${position['entry_price']:.2f} | P&L: ${pnl:.2f} ({pnl_pct:+.2f}%)",
                {'position_id': position['id'], 'pnl': pnl, 'pnl_pct': pnl_pct, 'reason': reason}
            )
        except Exception as e:
            logger.error(f"❌ CRITICAL ERROR closing position: {e}", exc_info=True)
            await self.log('error', f"❌ Failed to close position: {str(e)}", {'error': str(e)})
    
    async def log(self, log_type: str, message: str, data: dict):
        """Log activity"""
        try:
            supabase.table('bot_logs').insert({
                'bot_id': self.bot_id,
                'user_id': self.user_id,
                'log_type': log_type,
                'message': message,
                'data': data,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            logger.info(f"[{self.name}] {message}")
        except Exception as e:
            logger.error(f"Failed to log: {e}")
    
    async def log_update(self, update_type: str, pair: str, message: str, data: dict):
        """Update an existing log entry in place, or create new if doesn't exist"""
        try:
            # Determine which log ID dict to use
            if update_type == 'position_status':
                log_id_dict = self.position_log_ids
            elif update_type == 'market_metrics':
                log_id_dict = self.market_metrics_log_ids
            else:
                log_id_dict = self.monitoring_log_ids
            
            # Check if we have an existing log ID for this pair
            if pair in log_id_dict:
                log_id = log_id_dict[pair]
                # Update existing log
                try:
                    # Update log_type for market_metrics to ensure it's correct
                    update_data = {
                        'message': message,
                        'data': data,
                        'created_at': datetime.now().isoformat()  # Update timestamp so it stays at top
                    }
                    if update_type == 'market_metrics':
                        update_data['log_type'] = 'market_data'  # Ensure correct log type
                    
                    update_result = supabase.table('bot_logs')\
                        .update(update_data)\
                        .eq('id', log_id)\
                        .execute()
                    
                    # Verify update succeeded
                    if update_result.data and len(update_result.data) > 0:
                        logger.debug(f"✅ Updated {update_type} log for {pair} (ID: {log_id})")
                    else:
                        logger.warning(f"⚠️ Update returned no data for {pair}, log may not exist. Creating new.")
                        # Log doesn't exist, create new one
                        raise Exception("Log entry not found")
                except Exception as e:
                    logger.warning(f"Failed to update log for {pair}, creating new: {e}")
                    # If update fails, create new log
                    log_type = 'market_data' if update_type == 'market_metrics' else 'info'
                    result = supabase.table('bot_logs').insert({
                        'bot_id': self.bot_id,
                        'user_id': self.user_id,
                        'log_type': log_type,
                        'message': message,
                        'data': data,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    if result.data and len(result.data) > 0:
                        log_id_dict[pair] = result.data[0]['id']
            else:
                # Create new log and store ID
                log_type = 'market_data' if update_type == 'market_metrics' else 'info'
                result = supabase.table('bot_logs').insert({
                    'bot_id': self.bot_id,
                    'user_id': self.user_id,
                    'log_type': log_type,
                    'message': message,
                    'data': data,
                    'created_at': datetime.now().isoformat()
                }).execute()
                if result.data and len(result.data) > 0:
                    log_id_dict[pair] = result.data[0]['id']
                    logger.debug(f"Created new {update_type} log for {pair}")
        except Exception as e:
            logger.error(f"Failed to log_update for {pair}: {e}")


async def main():
    """Main entry point"""
    engine = BotEngine()
    await engine.start()

if __name__ == '__main__':
    asyncio.run(main())

