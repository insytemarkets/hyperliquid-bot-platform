import React from 'react';
import { Link } from 'react-router-dom';
import WalletConnectButton from './WalletConnectButton';
import { KVStatus } from './KVStatus';

interface HeaderProps {
  activeTab?: string;
}

const Header: React.FC<HeaderProps> = ({ activeTab = 'Dashboard' }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">HyperLiquid Bot Builder</h1>
                <p className="text-xs text-gray-500">Automated Trading Platform</p>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link 
                to="/dashboard" 
                className={`text-sm font-medium ${
                  activeTab === 'Dashboard' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                to="/bot-builder" 
                className={`text-sm font-medium ${
                  activeTab === 'Bot Builder' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Bot Builder
              </Link>
              <Link 
                to="/my-bots" 
                className={`text-sm font-medium ${
                  activeTab === 'My Bots' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Bots
              </Link>
              <Link 
                to="/templates" 
                className={`text-sm font-medium ${
                  activeTab === 'Templates' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Templates
              </Link>
              <Link 
                to="/strategies" 
                className={`text-sm font-medium ${
                  activeTab === 'Strategies' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Strategies
              </Link>
              <Link 
                to="/backtesting" 
                className={`text-sm font-medium ${
                  activeTab === 'Backtesting' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Backtesting
              </Link>
              <Link 
                to="/analytics" 
                className={`text-sm font-medium ${
                  activeTab === 'Analytics' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="card rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Active Bots</div>
              <div className="font-semibold text-gray-900">12</div>
            </div>
            <div className="card rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Total P&L</div>
              <div className="font-semibold profit">+$45,678.90</div>
            </div>
            
            {/* KV Status */}
            <KVStatus className="mr-4" />
            
            {/* Wallet Connection */}
            <WalletConnectButton />
            {activeTab === 'My Bots' && (
              <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                Bulk Actions
              </button>
            )}
            {activeTab === 'Templates' && (
              <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                Upload Template
              </button>
            )}
            {activeTab === 'Bot Builder' && (
              <>
                <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  Save Draft
                </button>
                <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  Backtest
                </button>
              </>
            )}
            {activeTab === 'Strategies' && (
              <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                Import Strategy
              </button>
            )}
            {activeTab === 'Analytics' && (
              <>
                <div className="date-range-picker">
                  <input type="date" className="date-input" defaultValue="2024-01-01" />
                  <span className="text-gray-500">to</span>
                  <input type="date" className="date-input" defaultValue="2024-01-31" />
                </div>
                <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  Export Report
                </button>
              </>
            )}
            {activeTab === 'Market Analytics' && (
              <>
                <div className="card rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">Market Cap</div>
                  <div className="font-semibold text-gray-900">$2.1T</div>
                </div>
                <div className="card rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">24h Volume</div>
                  <div className="font-semibold profit">$89.4B</div>
                </div>
              </>
            )}
            {activeTab === 'Backtesting' && (
              <>
                <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  Import Data
                </button>
                <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                  Export Results
                </button>
              </>
            )}
            {activeTab !== 'Analytics' && activeTab !== 'Market Analytics' && activeTab !== 'Backtesting' && (
              <button className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">
                {activeTab === 'Bot Builder' ? 'Deploy Bot' :
                 activeTab === 'Strategies' ? 'Create Strategy' :
                 activeTab === 'Templates' ? 'Create Template' : 
                 activeTab === 'My Bots' ? 'Create New Bot' : 'Create Bot'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;



