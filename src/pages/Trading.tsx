import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TradingInterface from '../components/TradingInterface';
import PositionsList from '../components/PositionsList';
import OrderHistory from '../components/OrderHistory';
import TradingChart from '../components/TradingChart';
import { useWallet } from '../contexts/WalletContext';
import { useAllMids } from '../hooks/useHyperliquid';

const Trading: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState('BTC-USD');
  const [activeTab, setActiveTab] = useState('positions');
  const { isConnected, accountSummary, userState } = useWallet();
  const { data: allMids } = useAllMids();

  // Available trading pairs from Hyperliquid
  const tradingPairs = allMids ? Object.keys(allMids).map(coin => `${coin}-USD`) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab="Trading" />
      
      <div className="flex h-screen">
        <Sidebar activeItem="Trading" />
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {!isConnected ? (
            // Not connected state
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600 mb-4">Connect your wallet and link to Hyperliquid to start trading</p>
                <div className="text-sm text-gray-500">
                  Use the "Connect Wallet" button in the header to get started
                </div>
              </div>
            </div>
          ) : (
            // Connected state - show trading interface
            <div className="p-6">
              {/* Account Summary */}
              {accountSummary && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Account Value</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ${accountSummary.accountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Available Balance</div>
                      <div className="text-lg font-semibold text-green-600">
                        ${accountSummary.withdrawable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Margin Used</div>
                      <div className="text-lg font-semibold text-orange-600">
                        ${accountSummary.totalMarginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Open Positions</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {accountSummary.positions}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Pair Selector */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Select Trading Pair</h3>
                  <select
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {tradingPairs.map(pair => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Main Trading Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Chart */}
                <div className="lg:col-span-2">
                  <TradingChart selectedPair={selectedPair} />
                </div>

                {/* Right Column - Trading Interface */}
                <div>
                  <TradingInterface selectedPair={selectedPair} />
                </div>
              </div>

              {/* Bottom Section - Positions and Orders */}
              <div className="mt-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                      {[
                        { id: 'positions', label: 'Positions', count: accountSummary?.positions || 0 },
                        { id: 'orders', label: 'Open Orders', count: 0 },
                        { id: 'history', label: 'Order History', count: 0 }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab.label}
                          {tab.count > 0 && (
                            <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === 'positions' && <PositionsList userState={userState} />}
                    {activeTab === 'orders' && <OrderHistory type="open" />}
                    {activeTab === 'history' && <OrderHistory type="history" />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Trading;




