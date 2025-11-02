import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAllMids } from '../hooks/useHyperliquid';

interface TradingInterfaceProps {
  selectedPair: string;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ selectedPair }) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { placeOrder, accountSummary, isConnected } = useWallet();
  const { data: allMids } = useAllMids();

  // Get current price for the selected pair
  const coin = selectedPair.split('-')[0];
  const currentPrice = allMids?.[coin] ? parseFloat(allMids[coin]) : 0;

  // Calculate order details
  const orderValue = parseFloat(amount) * (orderType === 'market' ? currentPrice : parseFloat(price));
  const marginRequired = orderValue / leverage;
  const availableBalance = accountSummary?.withdrawable || 0;

  useEffect(() => {
    if (orderType === 'market' && currentPrice > 0) {
      setPrice(currentPrice.toString());
    }
  }, [orderType, currentPrice]);

  const handlePlaceOrder = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      setError('Please enter a valid price');
      return;
    }

    if (marginRequired > availableBalance) {
      setError('Insufficient balance');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Get asset index for the coin
      const assetIndex = 0; // BTC is typically 0, ETH is 1, etc. - this should be dynamic based on coin

      const orderParams = {
        orders: [{
          a: assetIndex, // asset index
          b: side === 'buy', // is_buy
          p: orderType === 'market' ? '0' : price, // price (0 for market orders)
          s: amount, // size
          r: false, // reduce_only
          t: {
            limit: {
              tif: orderType === 'market' ? 'Ioc' as const : 'Gtc' as const // time in force
            }
          }
        }],
        grouping: 'na' as const
      };

      const result = await placeOrder(orderParams);
      
      if (result && result.response && result.response.type === 'order') {
        setSuccess(`${side.toUpperCase()} order placed successfully!`);
        // Reset form
        setAmount('');
        if (orderType === 'limit') setPrice('');
      } else {
        setError('Order failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (availableBalance > 0 && currentPrice > 0) {
      const maxAmount = (availableBalance * leverage) / currentPrice;
      setAmount(maxAmount.toFixed(6));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
      
      {/* Current Price Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Current Price</span>
          <span className="text-lg font-semibold text-gray-900">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="flex mb-4">
        <button
          onClick={() => setOrderType('market')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg border ${
            orderType === 'market'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg border-l-0 border ${
            orderType === 'limit'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Buy/Sell Tabs */}
      <div className="flex mb-4">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg border ${
            side === 'buy'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg border-l-0 border ${
            side === 'sell'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Price Input (for limit orders) */}
      {orderType === 'limit' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (USD)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount ({coin})
          </label>
          <button
            onClick={handleMaxAmount}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Max
          </button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.000001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Leverage Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Leverage
          </label>
          <span className="text-sm font-medium text-gray-900">{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
        </div>
      </div>

      {/* Order Summary */}
      {amount && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Order Value:</span>
            <span className="font-medium">${orderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Margin Required:</span>
            <span className="font-medium">${marginRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Available Balance:</span>
            <span className="font-medium">${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading || !isConnected || !amount}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          side === 'buy'
            ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
            : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
        } disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        <span>
          {loading 
            ? 'Placing Order...' 
            : `${side === 'buy' ? 'Buy' : 'Sell'} ${coin}`
          }
        </span>
      </button>

      {!isConnected && (
        <div className="text-center text-sm text-gray-500 mt-4">
          Connect your wallet to start trading
        </div>
      )}
    </div>
  );
};

export default TradingInterface;




