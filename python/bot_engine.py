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
        self.last_snapshot_log_time: float = 0  # Track last snapshot log
        self.last_analysis_log_time: float = 0  # Track last detailed analysis log (separate from snapshot)
        self.market_log_interval = 30  # Log market data every 30 seconds
        self.position_log_ids: Dict[str, str] = {}  # Track position status log IDs per pair (for updating in place)
        self.monitoring_log_ids: Dict[str, str] = {}  # Track monitoring log IDs per pair (for updating in place)
        self.last_position_update_time: Dict[str, float] = {}  # Track last position update time per pair (update every 5s)
        self.last_market_data_fetch: float = 0  # Track last market data fetch time
        self.cached_market_data: dict = {}  # Cache market data to avoid rate limits
        self.market_data_cache_ttl = 2  # Cache market data for 2 seconds
        self.last_position_close_time: Dict[str, float] = {}  # Track when positions were closed (cooldown period)
        self.position_cooldown = 60  # Wait 60 seconds after closing before opening new position on same pair
        
    def update_config(self, bot_data: dict):
        """Update bot configuration"""
        self.strategy = bot_data['strategies']
    
    async def get_candles_cached(self, pair: str, interval: str, start_time: int, end_time: int):
        """Fetch candles with caching to avoid rate limits"""
        cache_key = f"{pair}_{interval}_{start_time}"
        current_time = datetime.now().timestamp()
        
        # Check if we have cached data
        if cache_key in self.candle_cache:
            last_fetch = self.last_candle_fetch.get(cache_key, 0)
            if current_time - last_fetch < self.candle_cache_ttl:
                logger.debug(f"Using cached candles for {pair} {interval}")
                return self.candle_cache[cache_key]
        
        # Add rate limiting delay (1 second between calls to avoid 429 errors)
        await asyncio.sleep(1.0)
        
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
        
        # Log market snapshot (only every 30 seconds to avoid spam)
        current_time = datetime.now().timestamp()
        if current_time - self.last_snapshot_log_time >= self.market_log_interval:
            await self.log(
                'market_data',
                f"📊 Market Snapshot: {len(self.last_prices)} pairs tracked",
                {'prices': self.last_prices}
            )
            self.last_snapshot_log_time = current_time
        
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
        elif self.strategy['type'] == 'momentum_breakout':
            await self.run_momentum_breakout_strategy()
        elif self.strategy['type'] == 'multi_timeframe_breakout':
            await self.run_multi_timeframe_breakout_strategy()
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
                logger.debug(f"Fetching L2 snapshot for {pair}...")
                l2_data = info.l2_snapshot(pair)
                logger.debug(f"L2 response type: {type(l2_data)}, value: {l2_data}")
                
                # Check if API returned error code instead of data
                if isinstance(l2_data, int):
                    logger.warning(f"❌ L2 API returned error code {l2_data} for {pair} - skipping orderbook strategy")
                    await self.log('info', f"⚠️ Orderbook data unavailable for {pair}, using momentum strategy instead", {})
                    continue
                    
                if not l2_data or 'levels' not in l2_data:
                    logger.warning(f"Invalid L2 data structure for {pair}: {l2_data}")
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
                timeframes = ['5m', '15m', '30m']
                highs = {}
                lows = {}
                volumes = {}
                
                for tf in timeframes:
                    try:
                        # Get candles for timeframe - use proper interval, not just 1m
                        end_time = int(datetime.now().timestamp() * 1000)
                        if tf == '5m':
                            # For 5m: get last 20 candles (100 minutes) to ensure we have enough data
                            start_time = end_time - (20 * 5 * 60 * 1000)
                            interval = '5m'  # Use 5m candles, not 1m!
                        elif tf == '15m':
                            # For 15m: get last 20 candles (300 minutes = 5 hours)
                            start_time = end_time - (20 * 15 * 60 * 1000)
                            interval = '15m'  # Use 15m candles, not 1m!
                        else:  # 30m
                            # For 30m: get last 20 candles (600 minutes = 10 hours)
                            start_time = end_time - (20 * 30 * 60 * 1000)
                            interval = '30m'  # Use 30m candles, not 1m!
                        
                        candles = await self.get_candles_cached(pair, interval, start_time, end_time)
                        
                        if candles and len(candles) > 0:
                            # CRITICAL: Use only CLOSED candles (exclude the last/current incomplete candle)
                            # The last candle in the array is the current incomplete one, so we use the second-to-last
                            closed_candles = candles[:-1] if len(candles) > 1 else candles
                            
                            if len(closed_candles) > 0:
                                # Use the LAST CLOSED candle's high/low (not max/min of all candles)
                                last_closed_candle = closed_candles[-1]
                                tf_high = float(last_closed_candle['h'])
                                tf_low = float(last_closed_candle['l'])
                                
                                # Average volume from closed candles
                                tf_volume = sum(float(c['v']) for c in closed_candles) / len(closed_candles)
                                
                                highs[tf] = tf_high
                                lows[tf] = tf_low
                                volumes[tf] = tf_volume
                                
                                logger.debug(f"{pair} {tf}: Last closed candle H={tf_high:.2f} L={tf_low:.2f} (from {len(closed_candles)} closed candles)")
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
                
                # Calculate momentum score
                momentum_score = await self.calculate_momentum_score(pair, current_price)
                
                # Calculate volume weight
                volume_weight = await self.calculate_volume_weight(pair, volumes)
                
                # DEAD SIMPLE - Is price touching the high or low?
                # Allow 0.5% wiggle room to count as "touching"
                wiggle = 0.005  # 0.5%
                
                # Near highs? (price within 0.5% of high - FIXED: use absolute distance)
                near_high_30m = abs(current_price - highs['30m']) / highs['30m'] <= wiggle if highs['30m'] > 0 else False
                near_high_15m = abs(current_price - highs['15m']) / highs['15m'] <= wiggle if highs['15m'] > 0 else False
                near_high_5m = abs(current_price - highs['5m']) / highs['5m'] <= wiggle if highs['5m'] > 0 else False
                
                # Near lows? (price within 0.5% of low - FIXED: use absolute distance)
                near_low_30m = abs(current_price - lows['30m']) / lows['30m'] <= wiggle if lows['30m'] > 0 else False
                near_low_15m = abs(current_price - lows['15m']) / lows['15m'] <= wiggle if lows['15m'] > 0 else False
                near_low_5m = abs(current_price - lows['5m']) / lows['5m'] <= wiggle if lows['5m'] > 0 else False
                
                # Has volume?
                has_volume = volume_weight > 0.5
                
                # Log detailed market analysis (only every 30 seconds to avoid spam)
                # This logs even when we have an open position so we can monitor levels
                current_time = datetime.now().timestamp()
                if current_time - self.last_analysis_log_time >= self.market_log_interval:
                    # Calculate how close we are to triggers for ALL timeframes
                    high_5m_distance = ((current_price / highs['5m']) - 1) * 100
                    low_5m_distance = ((lows['5m'] / current_price) - 1) * 100
                    high_15m_distance = ((current_price / highs['15m']) - 1) * 100
                    low_15m_distance = ((lows['15m'] / current_price) - 1) * 100
                    high_30m_distance = ((current_price / highs['30m']) - 1) * 100
                    low_30m_distance = ((lows['30m'] / current_price) - 1) * 100
                    
                    await self.log(
                        'market_data',
                        f"{pair} | ${current_price:.2f} | 30m: ${highs['30m']:.2f}/{lows['30m']:.2f} ({high_30m_distance:+.3f}%/{low_30m_distance:+.3f}%) | 15m: ${highs['15m']:.2f}/{lows['15m']:.2f} ({high_15m_distance:+.3f}%/{low_15m_distance:+.3f}%) | 5m: ${highs['5m']:.2f}/${lows['5m']:.2f} ({high_5m_distance:+.3f}%/{low_5m_distance:+.3f}%) | Vol: {volume_weight:.2f}x",
                        {
                            'pair': pair,
                            'current_price': current_price,
                            'highs_30m': highs['30m'],
                            'lows_30m': lows['30m'],
                            'highs_15m': highs['15m'],
                            'lows_15m': lows['15m'],
                            'highs_5m': highs['5m'],
                            'lows_5m': lows['5m'],
                            'distance_to_high_30m': high_30m_distance,
                            'distance_to_low_30m': low_30m_distance,
                            'distance_to_high_15m': high_15m_distance,
                            'distance_to_low_15m': low_15m_distance,
                            'distance_to_high_5m': high_5m_distance,
                            'distance_to_low_5m': low_5m_distance,
                            'volume_weight': volume_weight,
                            'has_volume': has_volume,
                            'near_high_5m': near_high_5m,
                            'near_high_15m': near_high_15m,
                            'near_high_30m': near_high_30m,
                            'near_low_5m': near_low_5m,
                            'near_low_15m': near_low_15m,
                            'near_low_30m': near_low_30m,
                            'has_open_position': has_open_position
                        }
                    )
                    self.last_analysis_log_time = current_time  # UPDATE the timer after logging!
                
                # Update monitoring log when no position is open (every 5 seconds)
                if not has_open_position:
                    current_time_monitor = datetime.now().timestamp()
                    last_monitor_update = self.last_position_update_time.get(pair, 0)
                    
                    if current_time_monitor - last_monitor_update >= 5:  # Update every 5 seconds
                        # Calculate distances to entry levels
                        high_5m_dist = ((highs['5m'] - current_price) / current_price * 100) if highs['5m'] > 0 else 0
                        low_5m_dist = ((current_price - lows['5m']) / current_price * 100) if lows['5m'] > 0 else 0
                        high_15m_dist = ((highs['15m'] - current_price) / current_price * 100) if highs['15m'] > 0 else 0
                        low_15m_dist = ((current_price - lows['15m']) / current_price * 100) if lows['15m'] > 0 else 0
                        high_30m_dist = ((highs['30m'] - current_price) / current_price * 100) if highs['30m'] > 0 else 0
                        low_30m_dist = ((current_price - lows['30m']) / current_price * 100) if lows['30m'] > 0 else 0
                        
                        # Determine nearest entry level
                        nearest_level = "Monitoring..."
                        if near_high_30m or near_high_15m or near_high_5m:
                            nearest_level = "Near HIGH - Potential LONG entry"
                        elif near_low_30m or near_low_15m or near_low_5m:
                            nearest_level = "Near LOW - Potential LONG entry"
                        
                        message = f"👁️ Monitoring {pair} | Price: ${current_price:.2f} | {nearest_level} | 30m: ${highs['30m']:.2f}/{lows['30m']:.2f} ({high_30m_dist:+.2f}%/{low_30m_dist:+.2f}%) | 15m: ${highs['15m']:.2f}/{lows['15m']:.2f} ({high_15m_dist:+.2f}%/{low_15m_dist:+.2f}%) | 5m: ${highs['5m']:.2f}/${lows['5m']:.2f} ({high_5m_dist:+.2f}%/{low_5m_dist:+.2f}%) | Vol: {volume_weight:.2f}x"
                        data = {
                            'pair': pair,
                            'current_price': current_price,
                            'highs_30m': highs['30m'],
                            'lows_30m': lows['30m'],
                            'highs_15m': highs['15m'],
                            'lows_15m': lows['15m'],
                            'highs_5m': highs['5m'],
                            'lows_5m': lows['5m'],
                            'volume_weight': volume_weight,
                            'update_type': 'monitoring'
                        }
                        
                        await self.log_update('monitoring', pair, message, data)
                        self.last_position_update_time[pair] = current_time_monitor
                
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
                
                # Debug: Log all conditions for trade decision
                logger.debug(f"🔍 {pair} TRADE CHECK | Price: ${current_price:.2f} | "
                          f"Near 30m H/L: {near_high_30m}/{near_low_30m} (H=${highs['30m']:.2f} L=${lows['30m']:.2f}) | "
                          f"Near 15m H/L: {near_high_15m}/{near_low_15m} (H=${highs['15m']:.2f} L=${lows['15m']:.2f}) | "
                          f"Near 5m H/L: {near_high_5m}/{near_low_5m} (H=${highs['5m']:.2f} L=${lows['5m']:.2f}) | "
                          f"Volume: {volume_weight:.2f}x | HasVol: {has_volume}")
                
                # Near 30m high with volume
                if near_high_30m and has_volume:
                    reason = f"Near 30m high ${highs['30m']:.2f} with volume"
                # Near 30m low with volume
                elif near_low_30m and has_volume:
                    reason = f"Buy dip at 30m low ${lows['30m']:.2f} with volume"
                # Near 15m high with volume
                elif near_high_15m and has_volume:
                    reason = f"Near 15m high ${highs['15m']:.2f} with volume"
                # Near 15m low with volume
                elif near_low_15m and has_volume:
                    reason = f"Buy dip at 15m low ${lows['15m']:.2f} with volume"
                # Near 5m high OR low (no volume needed for 5m)
                elif near_high_5m:
                    reason = f"Near 5m high ${highs['5m']:.2f}"
                elif near_low_5m:
                    reason = f"Buy dip at 5m low ${lows['5m']:.2f}"
                
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
            # Use 5m volume as baseline
            current_volume = timeframe_volumes.get('5m', 0)
            baseline_volume = timeframe_volumes.get('15m', current_volume)
            
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
                # Update self.positions with fresh data from database
                self.positions = result.data
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
            
            # Check exit conditions
            should_close = False
            reason = ''
            
            # Get stop_loss and take_profit, handle None values
            stop_loss = position.get('stop_loss')
            take_profit = position.get('take_profit')
            
            # Log current status for debugging
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
            
            # Delete the position status log (it will be replaced with monitoring log)
            pair = position['symbol']
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
            log_id_dict = self.position_log_ids if update_type == 'position_status' else self.monitoring_log_ids
            
            # Check if we have an existing log ID for this pair
            if pair in log_id_dict:
                log_id = log_id_dict[pair]
                # Update existing log
                try:
                    update_result = supabase.table('bot_logs')\
                        .update({
                            'message': message,
                            'data': data,
                            'created_at': datetime.now().isoformat()  # Update timestamp so it stays at top
                        })\
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
                    result = supabase.table('bot_logs').insert({
                        'bot_id': self.bot_id,
                        'user_id': self.user_id,
                        'log_type': 'info',
                        'message': message,
                        'data': data,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    if result.data and len(result.data) > 0:
                        log_id_dict[pair] = result.data[0]['id']
            else:
                # Create new log and store ID
                result = supabase.table('bot_logs').insert({
                    'bot_id': self.bot_id,
                    'user_id': self.user_id,
                    'log_type': 'info',
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

