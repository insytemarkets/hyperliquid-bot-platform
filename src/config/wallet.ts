import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

// Hyperliquid runs on Arbitrum
export const config = getDefaultConfig({
  appName: 'Hyperliquid Bot Platform',
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'bd783dd4fc388c2346ffa233c44b1bce',
  chains: [arbitrum, arbitrumSepolia],
  ssr: false,
});

// Hyperliquid specific configuration
export const HYPERLIQUID_CONFIG = {
  // Hyperliquid uses Arbitrum mainnet
  CHAIN_ID: arbitrum.id,
  TESTNET_CHAIN_ID: arbitrumSepolia.id,
  
  // API endpoints
  MAINNET_API: 'https://api.hyperliquid.xyz',
  TESTNET_API: 'https://api.hyperliquid-testnet.xyz',
  
  // Contract addresses (if needed)
  CONTRACTS: {
    // Add Hyperliquid contract addresses here if needed
  }
};

export const isTestnet = process.env.REACT_APP_TESTNET === 'true';
