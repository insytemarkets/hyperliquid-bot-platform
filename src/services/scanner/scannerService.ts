/**
 * Scanner Service
 * Main service for token filtering, liquidity analysis, and levels analysis
 */

import { hyperliquidService } from '../hyperliquid';
import { calculateLevels, findClosestLevel } from './levelsCalculator';
import {
  ScannerToken,
  LiquidityData,
  LevelsData,
  TokenData,
  Trade,
} from '../../types/scanner';

const MIN_VOLUME = 50_000_000; // $50M
const MAX_DECLINE_THRESHOLD = -10; // -10%
const TOP_TOKENS_COUNT = 15;

/**
 * Get top tokens by volume with quality filters
 */
export async function getTopTokens(): Promise<TokenData[]> {
  try {
    // Fetch top 50 tokens by volume (we'll filter further)
    const tokens = await hyperliquidService.getTopTokensByVolume(MIN_VOLUME, 50);

    // Filter: volume >= $50M AND 24h change > -10%
    const filtered = tokens.filter(
      (token) => token.volume >= MIN_VOLUME && token.change24h > MAX_DECLINE_THRESHOLD
    );

    // Sort by volume and take top 15
    return filtered
      .sort((a, b) => b.volume - a.volume)
      .slice(0, TOP_TOKENS_COUNT)
      .map((token) => ({
        symbol: token.coin,
        price: token.price,
        volume: token.volume,
        change24h: token.change24h,
        prevDayPx: token.prevDayPx,
        markPx: token.markPx,
      }));
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    return [];
  }
}

/**
 * Analyze liquidity flow for a token
 */
export async function analyzeLiquidity(coin: string): Promise<LiquidityData | null> {
  try {
    const trades = await hyperliquidService.getRecentTrades(coin, 100);

    if (!trades || trades.length === 0) {
      return null;
    }

    let buyVolume = 0;
    let sellVolume = 0;
    let buyCount = 0;
    let sellCount = 0;

    trades.forEach((trade: Trade) => {
      const price = parseFloat(trade.px);
      const size = parseFloat(trade.sz);
      const volume = price * size;

      if (trade.side === 'B') {
        // Bid = buy
        buyVolume += volume;
        buyCount++;
      } else {
        // Ask = sell
        sellVolume += volume;
        sellCount++;
      }
    });

    const totalVolume = buyVolume + sellVolume;
    const netFlow = buyVolume - sellVolume;
    const flowRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;
    const avgBuySize = buyCount > 0 ? buyVolume / buyCount : 0;
    const avgSellSize = sellCount > 0 ? sellVolume / sellCount : 0;
    const priceImpact = totalVolume > 0 ? (netFlow / totalVolume) * 100 : 0;

    // Determine intensity based on absolute net flow
    let intensity: 'extreme' | 'high' | 'medium' | 'low';
    const absNetFlow = Math.abs(netFlow);
    if (absNetFlow > 5_000_000) {
      intensity = 'extreme';
    } else if (absNetFlow > 2_000_000) {
      intensity = 'high';
    } else if (absNetFlow > 500_000) {
      intensity = 'medium';
    } else {
      intensity = 'low';
    }

    // Determine flow direction
    let flowDirection: 'bullish' | 'bearish' | 'neutral';
    if (priceImpact > 0.05) {
      flowDirection = 'bullish';
    } else if (priceImpact < -0.05) {
      flowDirection = 'bearish';
    } else {
      flowDirection = 'neutral';
    }

    return {
      netFlow,
      buyVolume,
      sellVolume,
      buyCount,
      sellCount,
      flowRatio,
      avgBuySize,
      avgSellSize,
      intensity,
      priceImpact,
      flowDirection,
    };
  } catch (error) {
    console.error(`Error analyzing liquidity for ${coin}:`, error);
    return null;
  }
}

/**
 * Analyze levels for a token across multiple timeframes
 */
export async function analyzeLevels(coin: string, currentPrice: number): Promise<LevelsData | null> {
  try {
    const timeframes: Array<'5m' | '15m' | '30m' | '1h' | '4h' | '12h' | '1d'> = [
      '5m',
      '15m',
      '30m',
      '1h',
      '4h',
      '12h',
      '1d',
    ];

    const candlesByTimeframe = await hyperliquidService.getMultiTimeframeCandles(coin, timeframes);

    if (!candlesByTimeframe || Object.keys(candlesByTimeframe).length === 0) {
      return null;
    }

    // Calculate levels for each timeframe
    const allLevelsByTimeframe: Record<string, { support: any; resistance: any }> = {};

    Object.entries(candlesByTimeframe).forEach(([tf, candles]) => {
      if (candles && candles.length > 0) {
        const levels = calculateLevels(candles, tf, currentPrice);
        allLevelsByTimeframe[tf] = {
          support: levels.support,
          resistance: levels.resistance,
        };
      }
    });

    // Find closest level across all timeframes
    const closestLevel = findClosestLevel(allLevelsByTimeframe, currentPrice);

    // Get strongest support and resistance (weighted by timeframe)
    let strongestSupport: any = null;
    let strongestResistance: any = null;
    let maxSupportWeight = 0;
    let maxResistanceWeight = 0;

    Object.values(allLevelsByTimeframe).forEach((levels) => {
      if (levels.support && levels.support.weight > maxSupportWeight) {
        strongestSupport = levels.support;
        maxSupportWeight = levels.support.weight;
      }
      if (levels.resistance && levels.resistance.weight > maxResistanceWeight) {
        strongestResistance = levels.resistance;
        maxResistanceWeight = levels.resistance.weight;
      }
    });

    // Calculate price spread (mark vs index)
    // For now, we'll use mark price as both (Hyperliquid doesn't expose index price easily)
    // In a real implementation, you'd fetch index price separately
    const priceSpread = 0; // Placeholder - would calculate from mark/index prices

    return {
      closestLevel: closestLevel
        ? {
            price: closestLevel.price,
            timeframe: closestLevel.timeframe,
            type: closestLevel.type,
            distance: closestLevel.distance,
          }
        : null,
      support: strongestSupport,
      resistance: strongestResistance,
      priceSpread,
      indexPrice: currentPrice, // Placeholder
      markPrice: currentPrice,
    };
  } catch (error) {
    console.error(`Error analyzing levels for ${coin}:`, error);
    return null;
  }
}

/**
 * Get scanner data for all tokens (liquidity analysis)
 */
export async function getLiquidityScannerData(): Promise<ScannerToken[]> {
  const tokens = await getTopTokens();

  // Analyze liquidity for all tokens in parallel
  const analysisPromises = tokens.map(async (token) => {
    const liquidity = await analyzeLiquidity(token.symbol);
    return {
      ...token,
      liquidity: liquidity || undefined,
    } as ScannerToken;
  });

  return Promise.all(analysisPromises);
}

/**
 * Get scanner data for all tokens (levels analysis)
 */
export async function getLevelsScannerData(): Promise<ScannerToken[]> {
  const tokens = await getTopTokens();

  // Analyze levels for all tokens in parallel
  const analysisPromises = tokens.map(async (token) => {
    const levels = await analyzeLevels(token.symbol, token.price);
    return {
      ...token,
      levels: levels || undefined,
    } as ScannerToken;
  });

  return Promise.all(analysisPromises);
}

/**
 * Get combined scanner data (both liquidity and levels)
 */
export async function getCombinedScannerData(): Promise<ScannerToken[]> {
  const tokens = await getTopTokens();

  // Analyze both liquidity and levels in parallel
  const analysisPromises = tokens.map(async (token) => {
    const [liquidity, levels] = await Promise.all([
      analyzeLiquidity(token.symbol),
      analyzeLevels(token.symbol, token.price),
    ]);

    return {
      ...token,
      liquidity: liquidity || undefined,
      levels: levels || undefined,
    } as ScannerToken;
  });

  return Promise.all(analysisPromises);
}

