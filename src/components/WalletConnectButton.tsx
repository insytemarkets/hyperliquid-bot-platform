import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWallet } from '../contexts/WalletContext';

const WalletConnectButton: React.FC = () => {
  const { isConnected: wagmiConnected } = useAccount();
  const { 
    isConnected: hyperliquidConnected, 
    loading, 
    error, 
    connectToHyperliquid, 
    disconnectFromHyperliquid,
    accountSummary 
  } = useWallet();
  
  const [showError, setShowError] = useState(false);

  const handleHyperliquidConnect = async () => {
    try {
      setShowError(false);
      await connectToHyperliquid();
    } catch (err) {
      setShowError(true);
      console.error('Connection failed:', err);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={async () => {
                        try {
                          // Try to switch to Arbitrum automatically
                          if (window.ethereum) {
                            await window.ethereum.request({
                              method: 'wallet_switchEthereumChain',
                              params: [{ chainId: '0xa4b1' }], // Arbitrum mainnet
                            });
                          } else {
                            openChainModal();
                          }
                        } catch (error: any) {
                          // If chain not added, add it
                          if (error.code === 4902 && window.ethereum) {
                            try {
                              await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                  chainId: '0xa4b1',
                                  chainName: 'Arbitrum One',
                                  nativeCurrency: {
                                    name: 'Ether',
                                    symbol: 'ETH',
                                    decimals: 18,
                                  },
                                  rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                                  blockExplorerUrls: ['https://arbiscan.io/'],
                                }],
                              });
                            } catch (addError) {
                              console.error('Failed to add Arbitrum network:', addError);
                              openChainModal();
                            }
                          } else {
                            console.error('Failed to switch network:', error);
                            openChainModal();
                          }
                        }
                      }}
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Switch to Arbitrum
                    </button>
                  );
                }

                return (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={openChainModal}
                      style={{ display: 'flex', alignItems: 'center' }}
                      type="button"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      {account.displayName}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {wagmiConnected && (
        <div className="flex items-center space-x-2">
          {!hyperliquidConnected ? (
            <button
              onClick={handleHyperliquidConnect}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{loading ? 'Connecting...' : 'Connect Hyperliquid'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              {accountSummary && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs">
                  <span className="text-green-800 font-medium">${accountSummary.accountValue.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>HL</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showError && error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-2 py-1 rounded text-xs max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnectButton;

