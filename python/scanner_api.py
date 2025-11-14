"""
📊 Scanner API - Levels Endpoint
Separate Flask API for scanner levels calculation
Runs alongside bot_engine.py but doesn't interfere with bot logic
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from hyperliquid.info import Info
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import os
from loguru import logger

app = Flask(__name__)
CORS(app)  # Allow frontend to call this

# Initialize Hyperliquid Info client
info = Info(skip_ws=True)

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


@app.route('/api/scanner/levels', methods=['POST'])
def get_levels():
    """
    Calculate levels for a token
    POST body: { coin: str, currentPrice: float, timeframes: List[str] }
    Returns: { support, resistance, closestLevel, allLevelsByTimeframe }
    """
    try:
        data = request.get_json()
        coin = data.get('coin', '').upper()
        current_price = float(data.get('currentPrice', 0))
        timeframes = data.get('timeframes', ['15m', '30m', '1h'])
        
        if not coin or current_price <= 0:
            return jsonify({'error': 'Invalid coin or price'}), 400
        
        logger.info(f"📊 Calculating levels for {coin} at ${current_price}")
        
        end_time = int(datetime.now().timestamp() * 1000)
        all_levels_by_timeframe = {}
        
        # Fetch candles for each timeframe using the same method as multi-timeframe breakout
        # Reuse the proven get_candles_cached pattern
        for tf in timeframes:
            try:
                # Calculate start time based on timeframe (same as bot_engine.py)
                tf_minutes = {
                    '5m': 5, '15m': 15, '30m': 30, '1h': 60,
                    '4h': 240, '12h': 720, '1d': 1440
                }.get(tf, 60)
                
                # Fetch enough candles for levels calculation (50-100 depending on timeframe)
                # Same limits as multi-timeframe breakout strategy uses
                limit = 100 if tf in ['1h', '4h', '12h', '1d'] else 50
                start_time = end_time - (limit * tf_minutes * 60 * 1000)
                
                # Use the same method as bot_engine.py - add rate limiting delay
                import time
                time.sleep(1.5)  # Same delay as get_candles_cached uses
                
                # Fetch candles using Hyperliquid SDK (same as bot_engine.py)
                candles = info.candles_snapshot(coin, tf, start_time, end_time)
                
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
                
            except Exception as e:
                logger.error(f"❌ Error fetching {coin} {tf} candles: {e}")
                all_levels_by_timeframe[tf] = {'support': None, 'resistance': None}
        
        # Find closest level
        closest_level = find_closest_level(all_levels_by_timeframe, current_price)
        
        # Find strongest support/resistance
        support_candidates = []
        resistance_candidates = []
        
        for tf, levels in all_levels_by_timeframe.items():
            if levels.get('support') and levels['support']['price'] < current_price:
                support_candidates.append({
                    'price': levels['support']['price'],
                    'weight': levels['support']['weight'],
                    'timeframe': tf,
                })
            if levels.get('resistance') and levels['resistance']['price'] > current_price:
                resistance_candidates.append({
                    'price': levels['resistance']['price'],
                    'weight': levels['resistance']['weight'],
                    'timeframe': tf,
                })
        
        # Find strongest support (closest to price, then highest weight)
        strongest_support = None
        if support_candidates:
            support_candidates.sort(key=lambda c: (
                abs(current_price - c['price']) / current_price,
                -c['weight']
            ))
            strongest_support = support_candidates[0]
        
        # Find strongest resistance (closest to price, then highest weight)
        strongest_resistance = None
        if resistance_candidates:
            resistance_candidates.sort(key=lambda c: (
                abs(c['price'] - current_price) / current_price,
                -c['weight']
            ))
            strongest_resistance = resistance_candidates[0]
        
        return jsonify({
            'success': True,
            'coin': coin,
            'currentPrice': current_price,
            'support': strongest_support,
            'resistance': strongest_resistance,
            'closestLevel': closest_level,
            'allLevelsByTimeframe': all_levels_by_timeframe,
        })
        
    except Exception as e:
        logger.error(f"❌ Error in get_levels: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'scanner-api'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Scanner API starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

