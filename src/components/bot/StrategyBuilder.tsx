import React, { useState } from 'react';
import { StrategyConfig, StrategyType } from '../../services/bot-engine/types';
import { StrategyFactory } from '../../services/bot-engine';
import { useWallet } from '../../contexts/WalletContext';

interface StrategyBuilderProps {
  onSave: (config: StrategyConfig) => void;
  onCancel: () => void;
  initialConfig?: StrategyConfig;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ onSave, onCancel, initialConfig }) => {
  const [step, setStep] = useState(1);
  const { isConnected, exchangeClient } = useWallet();
  const [config, setConfig] = useState<Partial<StrategyConfig>>(initialConfig || {
    name: '',
    type: 'orderbook_imbalance',
    pairs: ['BTC'],
    enabled: true,
    mode: 'paper',
    positionSize: 100,
    maxPositions: 3,
    stopLossPercent: 0.3,
    takeProfitPercent: 0.5,
    parameters: {},
  });

  const strategyTypes: { value: StrategyType; label: string; description: string }[] = [
    {
      value: 'orderbook_imbalance',
      label: 'Order Book Imbalance',
      description: 'Quick scalping based on order book imbalances. Fast in-and-out trades.'
    },
    {
      value: 'orderbook_imbalance_v2',
      label: 'Order Book Imbalance v2',
      description: 'Improved order book imbalance strategy with better entry/exit logic. Enters when 70%+ bid volume, exits on reversal or time-based rules. High win rate and profit.'
    },
    {
      value: 'cross_pair_lag',
      label: 'Cross-Pair Lag',
      description: 'Trade alts when BTC moves before they catch up. High win rate.'
    },
    {
      value: 'momentum_breakout',
      label: 'Momentum Breakout',
      description: 'Trades strong price momentum moves (>2% change). Real strategy logic.'
    },
    {
      value: 'multi_timeframe_breakout',
      label: 'Multi-Timeframe Breakout',
      description: 'Advanced breakout strategy using 5m/15m/30m timeframes with dynamic risk management, volume analysis, and momentum scoring. Long-only quick scalps with tier-based entries.'
    },
    {
      value: 'liquidity_grab',
      label: 'Liquidity Grab',
      description: 'Buys when price wicks below support (1h/30m lows) then bounces back above it within 5 minutes with volume confirmation. Catches false breakdowns and liquidity grabs.'
    },
  ];

  const availablePairs = ['BTC', 'ETH', 'SOL', 'XRP', 'ARB', 'DOGE', 'AVAX'];

  const handleSave = () => {
    // Validate
    if (!config.name || !config.type) {
      alert('Please fill in all required fields');
      return;
    }

    // Get default parameters if not set
    if (!config.parameters || Object.keys(config.parameters).length === 0) {
      config.parameters = StrategyFactory.getDefaultParameters(config.type);
    }

    // Create full config
    const fullConfig: StrategyConfig = {
      id: initialConfig?.id || `strategy_${Date.now()}`,
      name: config.name!,
      type: config.type!,
      pairs: config.pairs || ['BTC'],
      enabled: config.enabled !== undefined ? config.enabled : true,
      mode: config.mode || 'paper',
      positionSize: config.positionSize || 100,
      maxPositions: config.maxPositions || 3,
      stopLossPercent: config.stopLossPercent || 0.3,
      takeProfitPercent: config.takeProfitPercent || 0.5,
      parameters: config.parameters || {},
      createdAt: initialConfig?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Validate
    const validation = StrategyFactory.validateConfig(fullConfig);
    if (!validation.valid) {
      alert(`Validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    onSave(fullConfig);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <h2 className="text-2xl font-bold">
            {initialConfig ? 'Edit Strategy' : 'Create New Strategy'}
          </h2>
          <div className="flex items-center space-x-4 mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-1 ${step > s ? 'bg-white' : 'bg-blue-500'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Strategy Type */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Choose Strategy Type
              </h3>
              <div className="space-y-3">
                {strategyTypes.map((st) => {
                  const metadata = StrategyFactory.getStrategyMetadata(st.value);
                  return (
                    <div
                      key={st.value}
                      onClick={() => setConfig({ ...config, type: st.value })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.type === st.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-semibold text-gray-900">{st.label}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              metadata.riskLevel === 'low'
                                ? 'bg-green-100 text-green-800'
                                : metadata.riskLevel === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {metadata.riskLevel.toUpperCase()} RISK
                            </span>
                            {metadata.recommended && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{st.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>⏱️ Avg Hold: {metadata.avgHoldTime}</span>
                            <span>✅ Win Rate: {metadata.winRate}</span>
                          </div>
                        </div>
                        {config.type === st.value && (
                          <div className="text-blue-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Trading Pairs */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Select Trading Pairs
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {availablePairs.map((pair) => (
                  <div
                    key={pair}
                    onClick={() => {
                      const pairs = config.pairs || [];
                      if (pairs.includes(pair)) {
                        setConfig({ ...config, pairs: pairs.filter(p => p !== pair) });
                      } else {
                        setConfig({ ...config, pairs: [...pairs, pair] });
                      }
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                      config.pairs?.includes(pair)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{pair}</div>
                    <div className="text-xs text-gray-500 mt-1">{pair}-USD</div>
                  </div>
                ))}
              </div>
              {config.pairs && config.pairs.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-900">
                    Selected: <span className="font-semibold">{config.pairs.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Risk Parameters */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Configure Risk Parameters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Size (USD per trade)
                  </label>
                  <input
                    type="number"
                    value={config.positionSize}
                    onChange={(e) => setConfig({ ...config, positionSize: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Concurrent Positions
                  </label>
                  <input
                    type="number"
                    value={config.maxPositions}
                    onChange={(e) => setConfig({ ...config, maxPositions: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.stopLossPercent}
                    onChange={(e) => setConfig({ ...config, stopLossPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.takeProfitPercent}
                    onChange={(e) => setConfig({ ...config, takeProfitPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Final Configuration */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 4: Name & Mode
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strategy Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Awesome Strategy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trading Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setConfig({ ...config, mode: 'paper' })}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.mode === 'paper'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Paper Trading</div>
                          <div className="text-xs text-gray-500 mt-1">Risk-free simulation</div>
                        </div>
                        {config.mode === 'paper' && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (!isConnected || !exchangeClient) {
                          alert('⚠️ Wallet not connected!\n\nLive trading requires a connected Hyperliquid wallet. Please connect your wallet first.');
                          return;
                        }
                        setConfig({ ...config, mode: 'live' });
                      }}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        config.mode === 'live'
                          ? 'border-red-600 bg-red-50'
                          : (!isConnected || !exchangeClient)
                            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Live Trading</div>
                          <div className="text-xs text-gray-500 mt-1">Real money</div>
                        </div>
                        {config.mode === 'live' && (
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {config.mode === 'paper' && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                      <div className="text-sm text-blue-900">
                        <div className="font-medium">Recommended for testing</div>
                        <div>Paper trading uses real market data but doesn't risk actual money. Perfect for testing strategies.</div>
                      </div>
                    </div>
                  </div>
                )}

                {config.mode === 'live' && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      <div className="text-sm text-red-900">
                        <div className="font-medium">🚨 WARNING: REAL MONEY TRADING</div>
                        <div className="space-y-1">
                          <div>• This will execute real trades with your Hyperliquid account</div>
                          <div>• You can lose money if the strategy performs poorly</div>
                          <div>• Always test strategies in paper mode first</div>
                          <div>• Start with small position sizes</div>
                          {(!isConnected || !exchangeClient) && (
                            <div className="text-red-700 font-medium mt-2">
                              ⚠️ Wallet not connected - live trading unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(!isConnected || !exchangeClient) && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                      <div className="text-sm text-yellow-900">
                        <div className="font-medium">Wallet Required for Live Trading</div>
                        <div>Connect your Hyperliquid wallet to enable live trading mode. Paper trading is always available.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                {initialConfig ? 'Update Strategy' : 'Create Strategy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;

