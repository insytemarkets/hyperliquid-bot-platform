/**
 * Levels Calculator
 * Touch-counting algorithm for support/resistance detection
 */

import { Level } from '../../types/scanner';

interface PriceZone {
  price: number;
  highTouches: number;
  lowTouches: number;
  totalTouches: number;
}

interface Candle {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '5m': 1,
  '15m': 2,
  '30m': 3,
  '1h': 4,
  '4h': 6,
  '12h': 8,
  '1d': 10,
};

const ZONE_THRESHOLD = 0.005; // 0.5% price grouping threshold

/**
 * Calculate support and resistance levels from candle data using touch-counting
 */
export function calculateLevels(
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): {
  support: Level | null;
  resistance: Level | null;
  allLevels: Level[];
} {
  if (!candles || candles.length === 0) {
    // Fallback to recent 20-candle high/low
    return getFallbackLevels(candles, timeframe, currentPrice);
  }

  const zones: PriceZone[] = [];

  // Process each candle to track touches
  candles.forEach((candle) => {
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);

    // Check high touch
    const highZone = findOrCreateZone(zones, high, currentPrice);
    if (highZone) {
      highZone.highTouches++;
      highZone.totalTouches++;
    }

    // Check low touch
    const lowZone = findOrCreateZone(zones, low, currentPrice);
    if (lowZone) {
      lowZone.lowTouches++;
      lowZone.totalTouches++;
    }
  });

  // Filter zones with at least 2 touches
  const significantZones = zones.filter((zone) => zone.totalTouches >= 2);

  if (significantZones.length === 0) {
    return getFallbackLevels(candles, timeframe, currentPrice);
  }

  // Sort by most touches (strongest levels first)
  significantZones.sort((a, b) => b.totalTouches - a.totalTouches);

  // Convert to Level objects
  const allLevels: Level[] = significantZones.map((zone) => ({
    price: zone.price,
    timeframe,
    type: zone.price < currentPrice ? 'support' : 'resistance',
    touches: zone.totalTouches,
    weight: TIMEFRAME_WEIGHTS[timeframe] || 1,
  }));

  // Find closest support (below price)
  const supportLevels = allLevels.filter((level) => level.price < currentPrice);
  const support = supportLevels.length > 0
    ? supportLevels.reduce((closest, current) =>
        currentPrice - current.price < currentPrice - closest.price ? current : closest
      )
    : null;

  // Find closest resistance (above price)
  const resistanceLevels = allLevels.filter((level) => level.price > currentPrice);
  const resistance = resistanceLevels.length > 0
    ? resistanceLevels.reduce((closest, current) =>
        current.price - currentPrice < closest.price - currentPrice ? current : closest
      )
    : null;

  return {
    support,
    resistance,
    allLevels,
  };
}

/**
 * Find or create a price zone for a given price
 */
function findOrCreateZone(
  zones: PriceZone[],
  price: number,
  currentPrice: number
): PriceZone | null {
  // Find existing zone within threshold
  for (const zone of zones) {
    const priceDiff = Math.abs(zone.price - price) / currentPrice;
    if (priceDiff <= ZONE_THRESHOLD) {
      return zone;
    }
  }

  // Create new zone
  const newZone: PriceZone = {
    price,
    highTouches: 0,
    lowTouches: 0,
    totalTouches: 0,
  };
  zones.push(newZone);
  return newZone;
}

/**
 * Fallback to recent 20-candle high/low if no zones found
 */
function getFallbackLevels(
  candles: Candle[],
  timeframe: string,
  currentPrice: number
): {
  support: Level | null;
  resistance: Level | null;
  allLevels: Level[];
} {
  if (!candles || candles.length === 0) {
    return { support: null, resistance: null, allLevels: [] };
  }

  // Use recent candles (at least 20, or all if less)
  const recentCandles = candles.slice(-Math.max(20, candles.length));
  if (recentCandles.length === 0) {
    return { support: null, resistance: null, allLevels: [] };
  }

  const highs = recentCandles.map((c) => parseFloat(c.high));
  const lows = recentCandles.map((c) => parseFloat(c.low));

  const recentHigh = Math.max(...highs);
  const recentLow = Math.min(...lows);

  const weight = TIMEFRAME_WEIGHTS[timeframe] || 1;

  const support: Level = {
    price: recentLow,
    timeframe,
    type: 'support',
    touches: 1,
    weight,
  };

  const resistance: Level = {
    price: recentHigh,
    timeframe,
    type: 'resistance',
    touches: 1,
    weight,
  };

  return {
    support: recentLow < currentPrice ? support : null,
    resistance: recentHigh > currentPrice ? resistance : null,
    allLevels: [support, resistance],
  };
}

/**
 * Find the closest level across all timeframes
 */
export function findClosestLevel(
  allLevelsByTimeframe: Record<string, { support: Level | null; resistance: Level | null }>,
  currentPrice: number
): {
  price: number;
  timeframe: string;
  type: 'HIGH' | 'LOW';
  distance: number;
} | null {
  const candidates: Array<{
    price: number;
    timeframe: string;
    type: 'HIGH' | 'LOW';
    distance: number;
    weight: number;
  }> = [];

  // Collect all support and resistance levels
  Object.entries(allLevelsByTimeframe).forEach(([tf, levels]) => {
    if (levels.support) {
      const distance = Math.abs(currentPrice - levels.support.price) / currentPrice * 100;
      candidates.push({
        price: levels.support.price,
        timeframe: tf,
        type: 'LOW',
        distance,
        weight: levels.support.weight,
      });
    }
    if (levels.resistance) {
      const distance = Math.abs(levels.resistance.price - currentPrice) / currentPrice * 100;
      candidates.push({
        price: levels.resistance.price,
        timeframe: tf,
        type: 'HIGH',
        distance,
        weight: levels.resistance.weight,
      });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // Sort by distance first (closer = better), then by weight (higher timeframe = better)
  candidates.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) < 0.01) {
      // If distances are very close, prefer higher timeframe
      return b.weight - a.weight;
    }
    return a.distance - b.distance;
  });

  const closest = candidates[0];
  return {
    price: closest.price,
    timeframe: closest.timeframe,
    type: closest.type,
    distance: closest.distance,
  };
}

