import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';

interface OrderHistoryProps {
  type: 'open' | 'history';
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ type }) => {
  const { cancelOrder, userState } = useWallet();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // In a real implementation, you would fetch orders from the Hyperliquid API
    // For now, we'll use mock data or extract from userState
    if (userState && userState.openOrders) {
      setOrders(userState.openOrders);
    } else {
      setOrders([]);
    }
  }, [userState, type]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder([{ a: 0, o: orderId }]); // asset index 0, order id
      // Refresh orders after cancellation
      setOrders(orders.filter(order => order.oid !== orderId));
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {type === 'open' ? 'No Open Orders' : 'No Order History'}
        </h3>
        <p className="text-gray-500">
          {type === 'open' 
            ? "You don't have any open orders. Place an order to see it here."
            : "You haven't placed any orders yet. Your order history will appear here."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Asset
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Side
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {type === 'open' && (
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((order: any, index: number) => {
            const timestamp = order.timestamp || Date.now();
            const side = order.side || (order.sz && parseFloat(order.sz) > 0 ? 'buy' : 'sell');
            const size = Math.abs(parseFloat(order.sz || order.origSz || '0'));
            const price = parseFloat(order.limitPx || order.px || '0');
            const orderType = order.orderType || (price > 0 ? 'limit' : 'market');
            const status = order.status || (type === 'open' ? 'open' : 'filled');

            return (
              <tr key={order.oid || index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 text-sm text-gray-900">
                  {new Date(timestamp).toLocaleString()}
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{order.coin || 'BTC'}</div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    side === 'buy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {side.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  {size.toFixed(6)}
                </td>
                <td className="py-4 px-4 text-right font-mono">
                  {orderType === 'market' ? 'Market' : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    orderType === 'market' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {orderType.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    status === 'filled' 
                      ? 'bg-green-100 text-green-800'
                      : status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status.toUpperCase()}
                  </span>
                </td>
                {type === 'open' && (
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleCancelOrder(order.oid)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistory;




