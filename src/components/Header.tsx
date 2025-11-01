import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '../contexts/WalletContext';

interface HeaderProps {
  activeTab?: string;
}

const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { isConnected, address } = useWallet();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">HyperLiquid Bot Platform</h1>
            {activeTab && (
              <span className="text-sm text-gray-500">/ {activeTab}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isConnected && address && (
              <div className="text-sm text-gray-600">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;