import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import * as hl from '@nktkas/hyperliquid';
import { isTestnet } from '../config/wallet';

interface WalletContextType {
  // Wallet connection state
  isConnected: boolean;
  address: string | undefined;
  
  // Hyperliquid clients
  infoClient: hl.InfoClient | null;
  exchangeClient: hl.ExchangeClient | null;
  
  // User data
  userState: any | null;
  accountSummary: {
    accountValue: number;
    totalMarginUsed: number;
    totalNtlPos: number;
    withdrawable: number;
    positions: number;
  } | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  connectToHyperliquid: () => Promise<void>;
  disconnectFromHyperliquid: () => void;
  refreshUserData: () => Promise<void>;
  
  // Trading functions
  placeOrder: (orderParams: any) => Promise<any>;
  cancelOrder: (orderParams: any) => Promise<any>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { address, isConnected: wagmiConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // State
  const [infoClient, setInfoClient] = useState<hl.InfoClient | null>(null);
  const [exchangeClient, setExchangeClient] = useState<hl.ExchangeClient | null>(null);
  const [userState, setUserState] = useState<any>(null);
  const [accountSummary, setAccountSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHyperliquidConnected, setIsHyperliquidConnected] = useState(false);

  // Initialize info client (doesn't require wallet)
  useEffect(() => {
    const client = new hl.InfoClient({
      transport: new hl.HttpTransport({ isTestnet }),
    });
    setInfoClient(client);
  }, []);

  // Connect to Hyperliquid when wallet is connected
  const connectToHyperliquid = async () => {
    if (!wagmiConnected || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      setError(null);

      // Check if we have ethereum provider
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found. Please install MetaMask or another wallet.');
      }

      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      const targetChain = isTestnet ? arbitrumSepolia : arbitrum;
      
      // Switch to correct network if needed
      if (currentChainId !== targetChain.id) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
          });
        } catch (switchError: any) {
          // If the chain hasn't been added to MetaMask, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${targetChain.id.toString(16)}`,
                chainName: targetChain.name,
                nativeCurrency: targetChain.nativeCurrency,
                rpcUrls: targetChain.rpcUrls.default.http,
                blockExplorerUrls: targetChain.blockExplorers?.default ? [targetChain.blockExplorers.default.url] : [],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      console.log('🔄 Creating wallet client with address:', address);
      console.log('🔄 Target chain:', targetChain.name, '(ID:', targetChain.id, ')');

      // Create wallet client using the connected wallet
      const walletClient = createWalletClient({
        account: address,
        chain: targetChain,
        transport: custom(window.ethereum),
      });

      console.log('✅ Wallet client created');

      // Create Hyperliquid exchange client
      const exchClient = new hl.ExchangeClient({
        wallet: walletClient as any,
        transport: new hl.HttpTransport({ isTestnet }),
      });

      console.log('✅ Hyperliquid exchange client created');

      setExchangeClient(exchClient);
      setIsHyperliquidConnected(true);

      console.log('🔄 Fetching user data from Hyperliquid...');

      // Fetch initial user data
      await refreshUserData();
      
      // Verify SDK connection by testing a read operation
      if (infoClient) {
        console.log('🧪 Testing SDK connection with meta info fetch...');
        try {
          const meta = await infoClient.meta();
          console.log('✅ SDK verified - Meta info:', {
            universe: meta.universe.length + ' assets',
            marginTables: meta.marginTables.length + ' margin tables',
          });
        } catch (testErr) {
          console.warn('⚠️ SDK test warning:', testErr);
        }
      }
      
      // Test exchange client signature capability
      console.log('🧪 Testing exchange client signature capability...');
      try {
        // Just verify the wallet client is working
        const chainId = await (walletClient as any).getChainId();
        console.log('✅ Wallet client verified - Chain ID:', chainId);
      } catch (testErr) {
        console.warn('⚠️ Wallet client test warning:', testErr);
      }
      
      console.log('✅ Connected to Hyperliquid successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Hyperliquid';
      setError(errorMessage);
      console.error('❌ Failed to connect to Hyperliquid:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from Hyperliquid
  const disconnectFromHyperliquid = () => {
    setExchangeClient(null);
    setUserState(null);
    setAccountSummary(null);
    setIsHyperliquidConnected(false);
    setError(null);
    console.log('🔌 Disconnected from Hyperliquid');
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (!infoClient || !address) {
      console.log('⚠️ Cannot refresh: missing infoClient or address');
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔄 Fetching clearinghouse state for address:', address);
      
      // Fetch user clearinghouse state
      const state = await infoClient.clearinghouseState({ user: address });
      
      console.log('✅ Clearinghouse state received:', state);
      
      setUserState(state);

      // Calculate account summary
      if (state && state.crossMarginSummary) {
        const summary = {
          accountValue: parseFloat(state.crossMarginSummary.accountValue),
          totalMarginUsed: parseFloat(state.crossMarginSummary.totalMarginUsed),
          totalNtlPos: parseFloat(state.crossMarginSummary.totalNtlPos),
          withdrawable: parseFloat(state.withdrawable),
          positions: state.assetPositions.length,
        };
        setAccountSummary(summary);
        console.log('✅ Account summary calculated:', summary);
      } else {
        console.log('⚠️ No crossMarginSummary in state');
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(errorMessage);
      console.error('❌ Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Place order
  const placeOrder = async (orderParams: any) => {
    if (!exchangeClient) {
      throw new Error('Exchange client not connected');
    }

    try {
      const result = await exchangeClient.order(orderParams);
      // Refresh user data after order
      setTimeout(refreshUserData, 1000);
      return result;
    } catch (error) {
      console.error('❌ Error placing order:', error);
      throw error;
    }
  };

  // Cancel order
  const cancelOrder = async (orderParams: any) => {
    if (!exchangeClient) {
      throw new Error('Exchange client not connected');
    }

    try {
      const result = await exchangeClient.cancel(orderParams);
      // Refresh user data after cancellation
      setTimeout(refreshUserData, 1000);
      return result;
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw error;
    }
  };

  // Auto-disconnect when wallet disconnects
  useEffect(() => {
    if (!wagmiConnected && isHyperliquidConnected) {
      disconnectFromHyperliquid();
    }
  }, [wagmiConnected, isHyperliquidConnected]);

  // Auto-refresh user data every 30 seconds when connected
  useEffect(() => {
    if (!isHyperliquidConnected || !address) return;

    const interval = setInterval(refreshUserData, 30000);
    return () => clearInterval(interval);
  }, [isHyperliquidConnected, address]);

  const value: WalletContextType = {
    // Connection state
    isConnected: wagmiConnected && isHyperliquidConnected,
    address,
    
    // Clients
    infoClient,
    exchangeClient,
    
    // User data
    userState,
    accountSummary,
    
    // Loading states
    loading,
    error,
    
    // Actions
    connectToHyperliquid,
    disconnectFromHyperliquid,
    refreshUserData,
    
    // Trading
    placeOrder,
    cancelOrder,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
