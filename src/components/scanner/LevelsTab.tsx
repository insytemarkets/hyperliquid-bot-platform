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
      return 'text-red-600 font-semibold';
    } else if (distance < 1.0) {
      return 'text-yellow-600 font-medium';
    } else {
      return 'text-green-600';
    }
  };

  const getDistanceBadge = (distance: number) => {
    if (distance < 0.5) {
      return <span className="text-xs font-semibold text-red-600">CRITICAL</span>;
    } else if (distance < 1.0) {
      return <span className="text-xs font-medium text-yellow-600">Important</span>;
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
    
    // Remove duplicates and sort by price
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  <span className="ml-1">{sortDirection === 'asc' ? '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('spread')}
              >
                Spread
                {sortField === 'spread' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {levels.priceSpread.toFixed(3)}%
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-6">
                            {/* All Levels by Timeframe */}
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
                                        {tfData.allLevels && tfData.allLevels.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="text-xs text-gray-500 mb-1">
                                              {tfData.allLevels.length} total level{tfData.allLevels.length !== 1 ? 's' : ''}
                                            </div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                              {tfData.allLevels.slice(0, 5).map((level, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs">
                                                  <span className={level.type === 'support' ? 'text-green-600' : 'text-red-600'}>
                                                    {formatPrice(level.price)}
                                                  </span>
                                                  <span className="text-gray-500">
                                                    {level.touches}t • {formatDistance(calculateLevelDistance(level.price, token.price))}
                                                  </span>
                                                </div>
                                              ))}
                                              {tfData.allLevels.length > 5 && (
                                                <div className="text-xs text-gray-400 italic">
                                                  +{tfData.allLevels.length - 5} more
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* All Levels Summary */}
                            {allLevels.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                  All Levels ({allLevels.length} total)
                                </h3>
                                <div className="bg-white rounded-lg border border-gray-200 p-4 max-h-64 overflow-y-auto">
                                  <div className="space-y-2">
                                    {allLevels.map((level, idx) => {
                                      const distance = calculateLevelDistance(level.price, token.price);
                                      const isAbove = level.price > token.price;
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center justify-between p-2 rounded ${
                                            isAbove ? 'bg-red-50' : 'bg-green-50'
                                          }`}
                                        >
                                          <div className="flex items-center space-x-3">
                                            <span
                                              className={`text-xs font-medium px-2 py-1 rounded ${
                                                level.type === 'support'
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-red-100 text-red-700'
                                              }`}
                                            >
                                              {level.type.toUpperCase()}
                                            </span>
                                            <div>
                                              <div className="text-sm font-semibold text-gray-900">
                                                {formatPrice(level.price)}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {level.timeframe} • Weight: {level.weight}x
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className={`text-sm font-medium ${getDistanceColor(Math.abs(distance))}`}>
                                              {formatDistance(distance)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {level.touches} touch{level.touches !== 1 ? 'es' : ''}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Volume Data (if available) */}
                            {token.liquidity && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Volume Intelligence</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Net Flow</div>
                                    <div className={`text-sm font-semibold ${token.liquidity.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${(token.liquidity.netFlow / 1_000_000).toFixed(2)}M
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Flow Ratio</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {(token.liquidity.flowRatio * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Avg Buy Size</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      ${(token.liquidity.avgBuySize / 1_000).toFixed(1)}K
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Intensity</div>
                                    <div className={`text-sm font-semibold ${
                                      token.liquidity.intensity === 'extreme' ? 'text-red-600' :
                                      token.liquidity.intensity === 'high' ? 'text-orange-600' :
                                      token.liquidity.intensity === 'medium' ? 'text-yellow-600' :
                                      'text-gray-600'
                                    }`}>
                                      {token.liquidity.intensity.toUpperCase()}
                                    </div>
                                  </div>
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
