import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import LiquidityTab from '../components/scanner/LiquidityTab';
import LevelsTab from '../components/scanner/LevelsTab';
import { ScannerTab } from '../types/scanner';
import { useScanner } from '../hooks/useScanner';

const Scanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ScannerTab>('liquidity');
  const [isLive, setIsLive] = useState(true);
  
  const { tokens, loading, error, lastUpdate } = useScanner(activeTab, isLive);

  const formatLastUpdate = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeItem="Scanner" />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Scanner</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Real-time order flow and support/resistance analysis
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Last updated:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatLastUpdate(lastUpdate)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">+ LIVE</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLive}
                        onChange={(e) => setIsLive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('liquidity')}
                  className={`${
                    activeTab === 'liquidity'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Liquidity
                </button>
                <button
                  onClick={() => setActiveTab('levels')}
                  className={`${
                    activeTab === 'levels'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Levels
                </button>
              </nav>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Scanner Content */}
            <div className="bg-white rounded-lg shadow">
              {activeTab === 'liquidity' ? (
                <LiquidityTab tokens={tokens} loading={loading} />
              ) : (
                <LevelsTab tokens={tokens} loading={loading} />
              )}
            </div>

            {/* Info Section */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Scanner Intelligence
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                {activeTab === 'liquidity' ? (
                  <>
                    <p>
                      <strong>Net Flow:</strong> Positive = Smart money buying, Negative =
                      Distribution phase
                    </p>
                    <p>
                      <strong>Order Size:</strong> Large avg sizes = Institutional activity,
                      Small = Retail FOMO
                    </p>
                    <p>
                      <strong>Flow Ratio:</strong> Extreme ratios often precede major moves
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>Distance Colors:</strong> Red (&lt;0.5%) = Critical, Yellow
                      (&lt;1%) = Important, Green (&gt;1%) = Safe
                    </p>
                    <p>
                      <strong>Support/Resistance:</strong> Calculated using touch-counting
                      algorithm across multiple timeframes
                    </p>
                    <p>
                      <strong>Timeframe Weights:</strong> Higher timeframes (1d, 12h, 4h) have
                      stronger levels
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Scanner;

