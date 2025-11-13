/**
 * Scanner Types
 * Type definitions for the Hyperliquid Scanner page
 */

export interface TokenData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  prevDayPx: number;
  markPx: number;
}

export interface Trade {
  time: number;
  coin: string;
  side: 'A' | 'B'; // A = ask (sell), B = bid (buy)
  px: string;
  sz: string;
  hash?: string;
}

export interface LiquidityData {
  netFlow: number; // buyVolume - sellVolume
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
  flowRatio: number; // buyVolume / totalVolume (0-1)
  avgBuySize: number;
  avgSellSize: number;
  intensity: 'extreme' | 'high' | 'medium' | 'low';
  priceImpact: number; // (netFlow / totalVolume) * 100
  flowDirection: 'bullish' | 'bearish' | 'neutral';
}

export interface Level {
  price: number;
  timeframe: string;
  type: 'support' | 'resistance' | 'mid';
  touches: number;
  weight: number; // Timeframe weight
}

export interface ClosestLevel {
  price: number;
  timeframe: string;
  type: 'HIGH' | 'LOW';
  distance: number; // Percentage distance from current price
}

export interface LevelsData {
  closestLevel: ClosestLevel | null;
  support: Level | null;
  resistance: Level | null;
  priceSpread: number; // Mark vs Index spread percentage
  indexPrice: number;
  markPrice: number;
}

export interface ScannerToken {
  // Base token data
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  
  // Liquidity data (for Liquidity tab)
  liquidity?: LiquidityData;
  
  // Levels data (for Levels tab)
  levels?: LevelsData;
}

export type ScannerTab = 'liquidity' | 'levels';

export interface ScannerFilters {
  symbol?: string;
  minVolume?: number;
  maxVolume?: number;
  minNetFlow?: number;
  maxNetFlow?: number;
  minDistance?: number;
  maxDistance?: number;
  minFlowRatio?: number;
  maxFlowRatio?: number;
}

