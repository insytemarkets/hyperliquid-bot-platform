import React from 'react';
import { useWallet } from '../contexts/WalletContext';

interface PositionsListProps {
  userState: any;
}

const PositionsList: React.FC<PositionsListProps> = ({ userState }) => {
  const { placeOrder } = useWallet();

  if (!userState || !userState.assetPositions || userState.assetPositions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Open Positions</h3>
        <p className="text-gray-500">You don't have any open positions yet. Start trading to see your positions here.</p>
      </div>
    );
  }

  const handleClosePosition = async (position: any) => {
    try {
      const size = Math.abs(parseFloat(position.position.szi));
      const isBuy = parseFloat(position.position.szi) < 0; // Close long with sell, close short with buy
      
      const orderParams = {
        orders: [{
          a: 0, // asset index - should be dynamic based on coin
          b: isBuy,
          p: '0', // market order
          s: size.toString(),
          r: true, // reduce_only = true for closing positions
          t: {
            limit: {
              tif: 'Ioc' as const
            }
          }
        }],
        grouping: 'na' as const
      };

      await placeOrder(orderParams);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Asset
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Entry Price
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Mark Price
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              PnL
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Margin
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Leverage
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {userState.assetPositions.map((assetPosition: any, index: number) => {
            const position = assetPosition.position;
            const size = parseFloat(position.szi);
            const entryPrice = position.entryPx ? parseFloat(position.entryPx) : 0;
            const unrealizedPnl = parseFloat(position.unrealizedPnl);
            const positionValue = parseFloat(position.positionValue);
            const marginUsed = parseFloat(position.marginUsed);
            const leverage = position.leverage?.value || 1;
            const liquidationPx = position.liquidationPx ? parseFloat(position.liquidationPx) : null;

            const isLong = size > 0;
            const isProfitable = unrealizedPnl > 0;

            return (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <div className="font-medium text-gray-900">{position.coin}</div>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isLong 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isLong ? 'LONG' : 'SHORT'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  {Math.abs(size).toFixed(6)}
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  ${(positionValue / Math.abs(size)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className={`font-mono ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {isProfitable ? '+' : ''}${unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                    {((unrealizedPnl / Math.abs(positionValue)) * 100).toFixed(2)}%
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-medium">{leverage}x</span>
                  {liquidationPx && (
                    <div className="text-xs text-gray-500">
                      Liq: ${liquidationPx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleClosePosition(assetPosition)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">
                      Modify
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PositionsList;

