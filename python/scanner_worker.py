"""
📊 Scanner Worker - Levels Calculator
Background worker that calculates support/resistance levels and writes to Supabase
Runs every 5 minutes, uses same candle fetching method as multi-timeframe bot
"""

import asyncio
import os
from datetime import datetime
from typing import Dict, List, Optional
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

# Initialize Hyperliquid (use mainnet, skip websocket for HTTP API)
info = Info(skip_ws=True)

# Constants
MIN_VOLUME = 50_000_000  # $50M minimum volume
MAX_DECLINE_THRESHOLD = -10  # -10% max 24h decline
TOP_TOKENS_COUNT = 10  # Top 10 tokens for levels

# Timeframe weights (higher = stronger levels)
TIMEFRAME_WEIGHTS = {
    '5m': 1,
    '15m': 2,
    '30m': 3,
    '1h': 4,
    '4h': 6,
    '12h': 8,
    '1d': 10,
}

ZONE_THRESHOLD = 0.005  # 0.5% price grouping threshold

# Caching for candles (same pattern as bot_engine.py)
candle_cache: Dict[str, dict] = {}
last_candle_fetch: Dict[str, float] = {}
candle_cache_ttl = 300  # 5 minutes cache


class PriceZone:
    """Represents a price zone for touch-counting"""
    def __init__(self, price: float):
        self.price = price
        self.high_touches = 0
        self.low_touches = 0
        self.total_touches = 0


def find_or_create_zone(zones: List[PriceZone], price: float, current_price: float) -> Optional[PriceZone]:
    """Find existing zone within threshold or create new one"""
    for zone in zones:
        price_diff = abs(zone.price - price) / current_price
        if price_diff <= ZONE_THRESHOLD:
            return zone
    
    # Create new zone
    new_zone = PriceZone(price)
    zones.append(new_zone)
    return new_zone


def calculate_levels(candles: List[dict], timeframe: str, current_price: float) -> dict:
    """
    Calculate support and resistance levels using touch-counting algorithm
    Returns: { support: Level | None, resistance: Level | None, allLevels: List[Level] }
    """
    if not candles or len(candles) == 0:
        return get_fallback_levels(candles, timeframe, current_price)
    
    zones: List[PriceZone] = []
    
    # Process each candle to track touches
    for candle in candles:
        high = float(candle.get('high', candle.get('h', 0)))
        low = float(candle.get('low', candle.get('l', 0)))
        
        if high <= 0 or low <= 0:
            continue
        
        # Check high touch
        high_zone = find_or_create_zone(zones, high, current_price)
        if high_zone:
            high_zone.high_touches += 1
            high_zone.total_touches += 1
        
        # Check low touch
        low_zone = find_or_create_zone(zones, low, current_price)
        if low_zone:
            low_zone.low_touches += 1
            low_zone.total_touches += 1
    
    # Filter zones with at least 2 touches
    significant_zones = [z for z in zones if z.total_touches >= 2]
    
    if len(significant_zones) == 0:
        return get_fallback_levels(candles, timeframe, current_price)
    
    # Sort by most touches (strongest levels first)
    significant_zones.sort(key=lambda z: z.total_touches, reverse=True)
    
    # Convert to Level objects
    all_levels = []
    for zone in significant_zones:
        level_type = 'support' if zone.price < current_price else 'resistance'
        all_levels.append({
            'price': zone.price,
            'timeframe': timeframe,
            'type': level_type,
            'touches': zone.total_touches,
            'weight': TIMEFRAME_WEIGHTS.get(timeframe, 1),
        })
    
    # Find closest support (below price)
    support_levels = [l for l in all_levels if l['price'] < current_price]
    support = None
    if support_levels:
        support = min(support_levels, key=lambda l: current_price - l['price'])
    
    # Find closest resistance (above price)
    resistance_levels = [l for l in all_levels if l['price'] > current_price]
    resistance = None
    if resistance_levels:
        resistance = min(resistance_levels, key=lambda l: l['price'] - current_price)
    
    return {
        'support': support,
        'resistance': resistance,
        'allLevels': all_levels,
    }


def get_fallback_levels(candles: List[dict], timeframe: str, current_price: float) -> dict:
    """Fallback to recent 20-candle high/low if no zones found"""
    if not candles or len(candles) == 0:
        return {'support': None, 'resistance': None, 'allLevels': []}
    
    # Use recent candles (at least 20, or all if less)
    recent_candles = candles[-max(20, len(candles)):]
    if len(recent_candles) == 0:
        return {'support': None, 'resistance': None, 'allLevels': []}
    
    highs = [float(c.get('high', c.get('h', 0))) for c in recent_candles]
    lows = [float(c.get('low', c.get('l', 0))) for c in recent_candles]
    
    recent_high = max(highs)
    recent_low = min(lows)
    
    weight = TIMEFRAME_WEIGHTS.get(timeframe, 1)
    
    support = {
        'price': recent_low,
        'timeframe': timeframe,
        'type': 'support',
        'touches': 1,
        'weight': weight,
    } if recent_low < current_price else None
    
    resistance = {
        'price': recent_high,
        'timeframe': timeframe,
        'type': 'resistance',
        'touches': 1,
        'weight': weight,
    } if recent_high > current_price else None
    
    return {
        'support': support,
        'resistance': resistance,
        'allLevels': [l for l in [support, resistance] if l is not None],
    }


def find_closest_level(all_levels_by_timeframe: Dict[str, dict], current_price: float) -> Optional[dict]:
    """Find the closest level across all timeframes"""
    candidates = []
    
    # Collect all support and resistance levels
    for tf, levels in all_levels_by_timeframe.items():
        if levels.get('support'):
            support = levels['support']
            distance = abs(current_price - support['price']) / current_price * 100
            candidates.append({
                'price': support['price'],
                'timeframe': tf,
                'type': 'LOW',
                'distance': distance,
                'weight': support['weight'],
            })
        
        if levels.get('resistance'):
            resistance = levels['resistance']
            distance = abs(resistance['price'] - current_price) / current_price * 100
            candidates.append({
                'price': resistance['price'],
                'timeframe': tf,
                'type': 'HIGH',
                'distance': distance,
                'weight': resistance['weight'],
            })
    
    if len(candidates) == 0:
        return None
    
    # Sort by distance first (closer = better), then by weight (higher timeframe = better)
    candidates.sort(key=lambda c: (c['distance'], -c['weight']))
    
    return candidates[0]


async def get_candles_cached(coin: str, interval: str, start_time: int, end_time: int) -> Optional[List[dict]]:
    """
    Fetch candles with caching to avoid rate limits
    Same method as bot_engine.py get_candles_cached()
    """
    # Use a more stable cache key that doesn't change every second
    # Round start_time to nearest minute to improve cache hit rate
    start_time_rounded = (start_time // 60000) * 60000  # Round to nearest minute
    cache_key = f"{coin}_{interval}_{start_time_rounded}"
    current_time = datetime.now().timestamp()
    
    # Check if we have cached data
    if cache_key in candle_cache:
        last_fetch = last_candle_fetch.get(cache_key, 0)
        if current_time - last_fetch < candle_cache_ttl:
            logger.debug(f"Using cached candles for {coin} {interval}")
            return candle_cache[cache_key]
    
    # Add rate limiting delay (1.5 seconds between calls to avoid 429 errors)
    await asyncio.sleep(1.5)
    
    try:
        candles = info.candles_snapshot(coin, interval, start_time, end_time)
        
        # Cache the result
        candle_cache[cache_key] = candles
        last_candle_fetch[cache_key] = current_time
        
        return candles
    except Exception as e:
        logger.error(f"Error fetching candles for {coin}: {e}")
        # Return cached data if available, even if expired
        if cache_key in candle_cache:
            logger.warning(f"Using stale cache for {coin} due to API error")
            return candle_cache[cache_key]
        return None


def get_top_tokens_by_volume() -> List[dict]:
    """
    Get top tokens by volume (>$50M, 24h change >-10%)
    Returns list of {coin, price, volume, change24h}
    """
    try:
        logger.debug("📡 Fetching token list from Hyperliquid...")
        response = info.meta_and_asset_ctxs()
        if not response or len(response) < 2:
            logger.warning("⚠️ Empty or invalid response from Hyperliquid API")
            return []
        
        # response[0] is meta dict, response[1] is asset_ctxs list
        meta = response[0]
        asset_ctxs = response[1]
        
        # Check if meta is dict and has 'universe' key
        if isinstance(meta, dict):
            universe = meta.get('universe', [])
        else:
            # If it's an object, try to access .universe attribute
            universe = getattr(meta, 'universe', [])
        
        if not universe or not asset_ctxs:
            logger.warning("⚠️ Empty universe or asset_ctxs")
            return []
        
        logger.debug(f"📊 Found {len(universe)} tokens in universe, {len(asset_ctxs)} asset contexts")
        
        token_list = []
        for i, asset_ctx in enumerate(asset_ctxs):
            if i >= len(universe):
                break
            
            # Get coin name from universe
            meta_item = universe[i]
            if isinstance(meta_item, dict):
                coin = meta_item.get('name')
            else:
                coin = getattr(meta_item, 'name', None)
            
            if not coin:
                continue
            
            # Get asset context data
            if isinstance(asset_ctx, dict):
                day_ntl_vlm = float(asset_ctx.get('dayNtlVlm', 0))
                prev_day_px = float(asset_ctx.get('prevDayPx', 0))
                mark_px = float(asset_ctx.get('markPx', 0))
            else:
                day_ntl_vlm = float(getattr(asset_ctx, 'dayNtlVlm', 0))
                prev_day_px = float(getattr(asset_ctx, 'prevDayPx', 0))
                mark_px = float(getattr(asset_ctx, 'markPx', 0))
            
            if day_ntl_vlm >= MIN_VOLUME and prev_day_px > 0 and mark_px > 0:
                change24h = ((mark_px - prev_day_px) / prev_day_px) * 100 if prev_day_px > 0 else 0
                if change24h > MAX_DECLINE_THRESHOLD:
                    token_list.append({
                        'coin': coin,
                        'price': mark_px,
                        'volume': day_ntl_vlm,
                        'change24h': change24h,
                    })
        
        # Sort by volume and return top N
        token_list.sort(key=lambda x: x['volume'], reverse=True)
        top_tokens = token_list[:TOP_TOKENS_COUNT]
        logger.info(f"✅ Found {len(top_tokens)} tokens matching criteria: {[t['coin'] for t in top_tokens]}")
        return top_tokens
    
    except Exception as e:
        logger.error(f"❌ Error fetching top tokens: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []


async def update_scanner_levels():
    """Update scanner levels for top tokens and write to Supabase"""
    logger.info("📊 Starting scanner levels update...")
    
    # Get top tokens by volume
    tokens = get_top_tokens_by_volume()
    if not tokens:
        logger.warning("⚠️ No tokens found matching criteria")
        return
    
    logger.info(f"✅ Found {len(tokens)} tokens to process: {[t['coin'] for t in tokens]}")
    
    end_time = int(datetime.now().timestamp() * 1000)
    timeframes = ['15m', '30m', '1h']
    
    for token in tokens:
        coin = token['coin']
        current_price = token['price']
        
        try:
            all_levels_by_timeframe = {}
            
            # Fetch candles for each timeframe using same method as multi-timeframe bot
            for tf in timeframes:
                try:
                    # Calculate start time based on timeframe (same as bot_engine.py)
                    tf_minutes = {
                        '15m': 15, '30m': 30, '1h': 60
                    }.get(tf, 60)
                    
                    # Fetch enough candles (50 for shorter timeframes)
                    limit = 50
                    start_time = end_time - (limit * tf_minutes * 60 * 1000)
                    
                    # Fetch candles using cached method (same as bot_engine.py)
                    candles = await get_candles_cached(coin, tf, start_time, end_time)
                    
                    if candles and len(candles) > 0:
                        # Use only closed candles (exclude current incomplete candle)
                        # Same logic as multi-timeframe breakout strategy
                        closed_candles = candles[:-1] if len(candles) > 1 else candles
                        
                        if len(closed_candles) > 0:
                            # Calculate levels for this timeframe
                            levels = calculate_levels(closed_candles, tf, current_price)
                            all_levels_by_timeframe[tf] = {
                                'support': levels['support'],
                                'resistance': levels['resistance'],
                            }
                            logger.debug(f"✅ {coin} {tf}: {len(closed_candles)} closed candles | Support={levels['support']['price'] if levels['support'] else 'N/A'}, Resistance={levels['resistance']['price'] if levels['resistance'] else 'N/A'}")
                        else:
                            all_levels_by_timeframe[tf] = {'support': None, 'resistance': None}
                            logger.warning(f"⚠️ {coin} {tf}: No closed candles")
                    else:
                        all_levels_by_timeframe[tf] = {'support': None, 'resistance': None}
                        logger.warning(f"⚠️ {coin} {tf}: No candles returned")
                    
                    # Small delay between timeframes to avoid rate limits
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"❌ Error fetching {coin} {tf} candles: {e}")
                    all_levels_by_timeframe[tf] = {'support': None, 'resistance': None}
            
            # Find closest level
            closest_level = find_closest_level(all_levels_by_timeframe, current_price)
            
            # Find strongest support/resistance from all timeframes
            support_candidates = []
            resistance_candidates = []
            
            for tf, levels in all_levels_by_timeframe.items():
                if levels.get('support') and levels['support']['price'] < current_price:
                    support_candidates.append({
                        'price': levels['support']['price'],
                        'weight': levels['support']['weight'],
                        'timeframe': tf,
                        'touches': levels['support'].get('touches', 1),
                    })
                if levels.get('resistance') and levels['resistance']['price'] > current_price:
                    resistance_candidates.append({
                        'price': levels['resistance']['price'],
                        'weight': levels['resistance']['weight'],
                        'timeframe': tf,
                        'touches': levels['resistance'].get('touches', 1),
                    })
            
            # Find strongest support (closest to price, then highest weight)
            strongest_support = None
            if support_candidates:
                support_candidates.sort(key=lambda c: (
                    abs(current_price - c['price']) / current_price,
                    -c['weight']
                ))
                strongest_support = {
                    'price': support_candidates[0]['price'],
                    'timeframe': support_candidates[0]['timeframe'],
                    'type': 'support',
                    'touches': support_candidates[0]['touches'],
                    'weight': support_candidates[0]['weight'],
                }
            
            # Find strongest resistance (closest to price, then highest weight)
            strongest_resistance = None
            if resistance_candidates:
                resistance_candidates.sort(key=lambda c: (
                    abs(c['price'] - current_price) / current_price,
                    -c['weight']
                ))
                strongest_resistance = {
                    'price': resistance_candidates[0]['price'],
                    'timeframe': resistance_candidates[0]['timeframe'],
                    'type': 'resistance',
                    'touches': resistance_candidates[0]['touches'],
                    'weight': resistance_candidates[0]['weight'],
                }
            
            # Upsert to Supabase
            try:
                supabase.table('scanner_levels').upsert({
                    'symbol': coin,
                    'current_price': float(current_price),
                    'support': strongest_support,
                    'resistance': strongest_resistance,
                    'closest_level': closest_level,
                    'all_levels_by_timeframe': all_levels_by_timeframe,
                    'updated_at': datetime.now().isoformat()
                }).execute()
                
                logger.info(f"✅ Updated levels for {coin}: Support={strongest_support['price'] if strongest_support else 'N/A'}, Resistance={strongest_resistance['price'] if strongest_resistance else 'N/A'}")
            except Exception as e:
                logger.error(f"❌ Error upserting levels for {coin} to Supabase: {e}")
            
            # Delay between tokens to avoid rate limits
            await asyncio.sleep(1.0)
            
        except Exception as e:
            logger.error(f"❌ Error processing {coin}: {e}")
            continue
    
    logger.info("✅ Scanner levels update completed")


async def main():
    """Main entry point - runs every 30 seconds"""
    logger.info("🚀 Scanner Worker Starting...")
    logger.info(f"📊 Configuration: Top {TOP_TOKENS_COUNT} tokens, Min Volume: ${MIN_VOLUME:,.0f}, Max Decline: {MAX_DECLINE_THRESHOLD}%")
    logger.info(f"🔗 Supabase URL: {SUPABASE_URL[:30]}...")
    
    # Run initial update immediately
    logger.info("🔄 Running initial levels update...")
    try:
        await update_scanner_levels()
    except Exception as e:
        logger.error(f"❌ Initial update failed: {e}")
    
    # Then run every 30 seconds
    while True:
        try:
            logger.info("⏰ Starting scheduled levels update...")
            await update_scanner_levels()
            logger.info("✅ Scheduled update completed, waiting 30 seconds...")
            # Wait 30 seconds before next update
            await asyncio.sleep(30)  # 30 seconds
        except Exception as e:
            logger.error(f"❌ Scanner worker error: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            await asyncio.sleep(10)  # Wait 10 seconds on error before retrying


if __name__ == '__main__':
    asyncio.run(main())

