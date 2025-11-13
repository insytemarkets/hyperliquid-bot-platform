import React, { useState, useMemo } from 'react';
import { ScannerToken } from '../../types/scanner';
import { hyperliquidService } from '../../services/hyperliquid';

interface LevelsTabProps {
  tokens: ScannerToken[];
  loading: boolean;
}

type SortField = 'symbol' | 'price' | 'change24h' | 'distance' | 'support' | 'resistance' | 'spread';
type SortDirection = 'asc' | 'desc';

const LevelsTab: React.FC<LevelsTabProps> = ({ tokens, loading }) => {
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
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

                return (
                  <tr key={token.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{token.symbol}</span>
                        <span className="ml-2 text-xs text-gray-500">↑</span>
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

