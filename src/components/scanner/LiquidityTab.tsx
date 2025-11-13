import React, { useState, useMemo } from 'react';
import { ScannerToken, LiquidityData } from '../../types/scanner';
import { hyperliquidService } from '../../services/hyperliquid';

interface LiquidityTabProps {
  tokens: ScannerToken[];
  loading: boolean;
}

type SortField = 'symbol' | 'netFlow' | 'buyVolume' | 'sellVolume' | 'flowRatio' | 'avgBuy' | 'avgSell' | 'intensity';
type SortDirection = 'asc' | 'desc';

const LiquidityTab: React.FC<LiquidityTabProps> = ({ tokens, loading }) => {
  const [sortField, setSortField] = useState<SortField>('netFlow');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedTokens = useMemo(() => {
    const filtered = tokens.filter((token) => token.liquidity);
    
    return [...filtered].sort((a, b) => {
      const aLiquidity = a.liquidity!;
      const bLiquidity = b.liquidity!;
      
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'symbol':
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case 'netFlow':
          aValue = aLiquidity.netFlow;
          bValue = bLiquidity.netFlow;
          break;
        case 'buyVolume':
          aValue = aLiquidity.buyVolume;
          bValue = bLiquidity.buyVolume;
          break;
        case 'sellVolume':
          aValue = aLiquidity.sellVolume;
          bValue = bLiquidity.sellVolume;
          break;
        case 'flowRatio':
          aValue = aLiquidity.flowRatio;
          bValue = bLiquidity.flowRatio;
          break;
        case 'avgBuy':
          aValue = aLiquidity.avgBuySize;
          bValue = bLiquidity.avgBuySize;
          break;
        case 'avgSell':
          aValue = aLiquidity.avgSellSize;
          bValue = bLiquidity.avgSellSize;
          break;
        case 'intensity':
          const intensityOrder = { extreme: 4, high: 3, medium: 2, low: 1 };
          aValue = intensityOrder[aLiquidity.intensity];
          bValue = intensityOrder[bLiquidity.intensity];
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
      setSortDirection('desc');
    }
  };

  const getIntensityBadgeColor = (intensity: string) => {
    switch (intensity) {
      case 'extreme':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatFlow = (value: number) => {
    return hyperliquidService.formatVolume(value);
  };

  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
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
                Symbol
                {sortField === 'symbol' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('netFlow')}
              >
                Net Flow ↓
                {sortField === 'netFlow' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('buyVolume')}
              >
                Buy Volume
                {sortField === 'buyVolume' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sellVolume')}
              >
                Sell Volume
                {sortField === 'sellVolume' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('flowRatio')}
              >
                Flow Ratio
                {sortField === 'flowRatio' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('avgBuy')}
              >
                Avg Buy
                {sortField === 'avgBuy' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('avgSell')}
              >
                Avg Sell
                {sortField === 'avgSell' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('intensity')}
              >
                Intensity
                {sortField === 'intensity' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  No liquidity data available
                </td>
              </tr>
            ) : (
              sortedTokens.map((token) => {
                const liquidity = token.liquidity!;
                const isPositiveFlow = liquidity.netFlow >= 0;
                const flowRatioPercent = liquidity.flowRatio * 100;

                return (
                  <tr key={`liquidity-${token.symbol}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{token.symbol}</span>
                        <span className="ml-2 text-xs text-gray-500">↑</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          isPositiveFlow ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositiveFlow ? '+' : ''}
                        {formatFlow(liquidity.netFlow)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFlow(liquidity.buyVolume)}
                      <span className="ml-1 text-xs text-gray-500">({liquidity.buyCount})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFlow(liquidity.sellVolume)}
                      <span className="ml-1 text-xs text-gray-500">({liquidity.sellCount})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              liquidity.flowRatio > 0.5 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${flowRatioPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{formatNumber(flowRatioPercent, 1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFlow(liquidity.avgBuySize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFlow(liquidity.avgSellSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getIntensityBadgeColor(
                          liquidity.intensity
                        )}`}
                      >
                        {liquidity.intensity.toUpperCase()}
                      </span>
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

export default LiquidityTab;

