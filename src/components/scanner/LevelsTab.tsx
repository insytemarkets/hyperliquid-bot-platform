import React, { useState, useMemo } from 'react';
import { ScannerToken } from '../../types/scanner';
import { hyperliquidService } from '../../services/hyperliquid';
import { Level } from '../../types/scanner';

interface LevelsTabProps {
  tokens: ScannerToken[];
  loading: boolean;
}

type SortField = 'symbol' | 'price' | 'change24h' | 'distance' | 'support' | 'resistance' | 'spread';
type SortDirection = 'asc' | 'desc';

const LevelsTab: React.FC<LevelsTabProps> = ({ tokens, loading }) => {
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const toggleExpand = (symbol: string) => {
    setExpandedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const sortedTokens = useMemo(() => {
    const filtered = tokens.filter((token) => token.levels);
    
    return [...filtered].sort((a, b) => {
      const aLevels = a.levels!;
      const bLevels = b.levels!;
      
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'symbol':
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change24h':
          aValue = a.change24h;
          bValue = b.change24h;
          break;
        case 'distance':
          aValue = aLevels.closestLevel?.distance || 999;
          bValue = bLevels.closestLevel?.distance || 999;
          break;
        case 'support':
          aValue = aLevels.support?.price || 0;
          bValue = bLevels.support?.price || 0;
          break;
        case 'resistance':
          aValue = aLevels.resistance?.price || 0;
          bValue = bLevels.resistance?.price || 0;
          break;
        case 'spread':
          aValue = aLevels.priceSpread;
          bValue = bLevels.priceSpread;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [tokens, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'distance' ? 'asc' : 'desc');
    }
  };

  const getDistanceColor = (distance: number) => {
    if (distance < 0.5) {
      return 'text-red-500';
    } else if (distance < 1.0) {
      return 'text-yellow-500';
    } else {
      return 'text-green-500';
    }
  };

  const getDistanceBadge = (distance: number) => {
    if (distance < 0.5) {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-400 rounded">CRITICAL</span>;
    } else if (distance < 1.0) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">IMPORTANT</span>;
    } else {
      return null;
    }
  };

  const formatPrice = (price: number) => {
    return hyperliquidService.formatPrice(price, 2);
  };

  const formatDistance = (distance: number) => {
    return `${distance >= 0 ? '+' : ''}${distance.toFixed(2)}%`;
  };

  const calculateLevelDistance = (levelPrice: number, currentPrice: number) => {
    return ((levelPrice - currentPrice) / currentPrice) * 100;
  };

  const getAllLevelsForToken = (token: ScannerToken): Level[] => {
    const levels = token.levels;
    if (!levels?.allLevelsByTimeframe) return [];
    
    const allLevels: Level[] = [];
    Object.values(levels.allLevelsByTimeframe).forEach((tfData) => {
      if (tfData.allLevels) {
        allLevels.push(...tfData.allLevels);
      }
      if (tfData.support) allLevels.push(tfData.support);
      if (tfData.resistance) allLevels.push(tfData.resistance);
    });
    
    const uniqueLevels = Array.from(
      new Map(allLevels.map((level) => [`${level.price}-${level.type}`, level])).values()
    );
    
    return uniqueLevels.sort((a, b) => b.price - a.price);
  };

  const getTimeframeWeight = (timeframe: string): number => {
    const weights: Record<string, number> = {
      '5m': 1,
      '15m': 2,
      '30m': 3,
      '1h': 4,
      '4h': 6,
      '12h': 8,
      '1d': 10,
    };
    return weights[timeframe] || 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Card-based Grid View
  if (viewMode === 'grid') {
    return (
      <div className="p-6">
        {/* View Mode Toggle */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg bg-gray-800 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedTokens.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-12">
              No levels data available
            </div>
          ) : (
            sortedTokens.map((token) => {
              const levels = token.levels!;
              const closestLevel = levels.closestLevel;
              const support = levels.support;
              const resistance = levels.resistance;
              const supportDistance = support
                ? calculateLevelDistance(support.price, token.price)
                : null;
              const resistanceDistance = resistance
                ? calculateLevelDistance(resistance.price, token.price)
                : null;
              const isExpanded = expandedTokens.has(token.symbol);
              const allLevels = getAllLevelsForToken(token);

              return (
                <div
                  key={`levels-card-${token.symbol}`}
                  className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all cursor-pointer overflow-hidden"
                  onClick={() => toggleExpand(token.symbol)}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{token.symbol}</h3>
                      {getDistanceBadge(closestLevel?.distance || 999)}
                    </div>
                    
                    {/* Price - Large Display */}
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-white">
                        {formatPrice(token.price)}
                      </span>
                      <span
                        className={`text-sm font-semibold flex items-center ${
                          token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {token.change24h >= 0 ? (
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {token.change24h >= 0 ? '+' : ''}
                        {token.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Card Body - Key Metrics */}
                  <div className="p-4 space-y-3">
                    {/* Closest Level */}
                    {closestLevel && (
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wide">Closest Level</span>
                          <span className="text-xs text-gray-500">{closestLevel.timeframe} {closestLevel.type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-white">
                            {formatPrice(closestLevel.price)}
                          </span>
                          <span className={`text-sm font-medium ${getDistanceColor(closestLevel.distance)}`}>
                            {formatDistance(closestLevel.distance)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Support & Resistance Row */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Support */}
                      <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/30">
                        <div className="text-xs text-green-400 mb-1">Support</div>
                        {support ? (
                          <>
                            <div className="text-sm font-semibold text-white mb-1">
                              {formatPrice(support.price)}
                            </div>
                            {supportDistance !== null && (
                              <div className="text-xs text-green-400">
                                {formatDistance(supportDistance)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">N/A</div>
                        )}
                      </div>

                      {/* Resistance */}
                      <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/30">
                        <div className="text-xs text-red-400 mb-1">Resistance</div>
                        {resistance ? (
                          <>
                            <div className="text-sm font-semibold text-white mb-1">
                              {formatPrice(resistance.price)}
                            </div>
                            {resistanceDistance !== null && (
                              <div className="text-xs text-red-400">
                                {formatDistance(resistanceDistance)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">N/A</div>
                        )}
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    <div className="flex items-center justify-center pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(token.symbol);
                        }}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        {isExpanded ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 bg-gray-900/50 p-4 space-y-4">
                      {/* All Levels by Timeframe */}
                      {levels.allLevelsByTimeframe && Object.keys(levels.allLevelsByTimeframe).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3">Levels by Timeframe</h4>
                          <div className="space-y-2">
                            {Object.entries(levels.allLevelsByTimeframe).map(([timeframe, tfData]) => (
                              <div key={timeframe} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-300">{timeframe}</span>
                                  <span className="text-xs text-gray-500">
                                    Weight: {getTimeframeWeight(timeframe)}x
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {tfData.support && (
                                    <div className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/20">
                                      <div>
                                        <div className="text-xs text-green-400">Support</div>
                                        <div className="text-sm font-semibold text-white">
                                          {formatPrice(tfData.support.price)}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-green-400">
                                          {formatDistance(calculateLevelDistance(tfData.support.price, token.price))}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {tfData.support.touches} touch{tfData.support.touches !== 1 ? 'es' : ''}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {tfData.resistance && (
                                    <div className="flex items-center justify-between p-2 bg-red-500/10 rounded border border-red-500/20">
                                      <div>
                                        <div className="text-xs text-red-400">Resistance</div>
                                        <div className="text-sm font-semibold text-white">
                                          {formatPrice(tfData.resistance.price)}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-red-400">
                                          {formatDistance(calculateLevelDistance(tfData.resistance.price, token.price))}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {tfData.resistance.touches} touch{tfData.resistance.touches !== 1 ? 'es' : ''}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Volume Intelligence */}
                      {token.liquidity && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3">Volume Intelligence</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                              <div className="text-xs text-gray-400">Net Flow</div>
                              <div className={`text-sm font-semibold ${token.liquidity.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${(token.liquidity.netFlow / 1_000_000).toFixed(2)}M
                              </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                              <div className="text-xs text-gray-400">Flow Ratio</div>
                              <div className="text-sm font-semibold text-white">
                                {(token.liquidity.flowRatio * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Original Table View (as fallback)
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 flex justify-end">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                {/* Expand column */}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('symbol')}
              >
                Token
                {sortField === 'symbol' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                Price
                {sortField === 'price' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('change24h')}
              >
                24H %
                {sortField === 'change24h' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('distance')}
              >
                Closest Level
                {sortField === 'distance' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('distance')}
              >
                Distance
                {sortField === 'distance' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('support')}
              >
                Support
                {sortField === 'support' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('resistance')}
              >
                Resistance
                {sortField === 'resistance' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No levels data available
                </td>
              </tr>
            ) : (
              sortedTokens.map((token) => {
                const levels = token.levels!;
                const closestLevel = levels.closestLevel;
                const support = levels.support;
                const resistance = levels.resistance;
                const supportDistance = support
                  ? calculateLevelDistance(support.price, token.price)
                  : null;
                const resistanceDistance = resistance
                  ? calculateLevelDistance(resistance.price, token.price)
                  : null;
                const isExpanded = expandedTokens.has(token.symbol);
                const allLevels = getAllLevelsForToken(token);

                return (
                  <React.Fragment key={`levels-${token.symbol}`}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(token.symbol)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="text-gray-400 hover:text-gray-600 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(token.symbol);
                          }}
                        >
                          {isExpanded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{token.symbol}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(token.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {token.change24h >= 0 ? '+' : ''}
                          {token.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {closestLevel ? (
                          <div>
                            <div>{formatPrice(closestLevel.price)}</div>
                            <div className="text-xs text-gray-500">
                              {closestLevel.timeframe} {closestLevel.type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {closestLevel ? (
                          <div>
                            <span className={getDistanceColor(closestLevel.distance)}>
                              {formatDistance(closestLevel.distance)}
                            </span>
                            {getDistanceBadge(closestLevel.distance) && (
                              <div className="mt-1">{getDistanceBadge(closestLevel.distance)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {support ? (
                          <div>
                            <div>{formatPrice(support.price)}</div>
                            {supportDistance !== null && (
                              <div className="text-xs text-gray-500">
                                ({formatDistance(supportDistance)})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resistance ? (
                          <div>
                            <div>{formatPrice(resistance.price)}</div>
                            {resistanceDistance !== null && (
                              <div className="text-xs text-gray-500">
                                ({formatDistance(resistanceDistance)})
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-6">
                            {levels.allLevelsByTimeframe && Object.keys(levels.allLevelsByTimeframe).length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">All Levels by Timeframe</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {Object.entries(levels.allLevelsByTimeframe).map(([timeframe, tfData]) => (
                                    <div key={timeframe} className="bg-white rounded-lg border border-gray-200 p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-gray-900">{timeframe}</span>
                                        <span className="text-xs text-gray-500">
                                          Weight: {getTimeframeWeight(timeframe)}x
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {tfData.support && (
                                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                            <div>
                                              <div className="text-xs font-medium text-green-700">Support</div>
                                              <div className="text-sm font-semibold text-gray-900">
                                                {formatPrice(tfData.support.price)}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-xs text-gray-500">
                                                {formatDistance(calculateLevelDistance(tfData.support.price, token.price))}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {tfData.support.touches} touch{tfData.support.touches !== 1 ? 'es' : ''}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {tfData.resistance && (
                                          <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                                            <div>
                                              <div className="text-xs font-medium text-red-700">Resistance</div>
                                              <div className="text-sm font-semibold text-gray-900">
                                                {formatPrice(tfData.resistance.price)}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-xs text-gray-500">
                                                {formatDistance(calculateLevelDistance(tfData.resistance.price, token.price))}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {tfData.resistance.touches} touch{tfData.resistance.touches !== 1 ? 'es' : ''}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LevelsTab;
