# Wallet Connection Guide

## ✅ Proper Configuration Applied

### 1. Reown (WalletConnect) Project ID
- **Your Project ID**: `bd783dd4fc388c2346ffa233c44b1bce`
- **Location**: `src/config/wallet.ts`
- **Status**: ✅ Configured

### 2. Supported Networks
- **Arbitrum One** (Mainnet) - Chain ID: 42161 (0xa4b1)
- **Arbitrum Sepolia** (Testnet) - Chain ID: 421614

### 3. How to Connect

#### Step 1: Connect Your Wallet
1. Click **"Connect Wallet"** button in the header
2. Choose your wallet (MetaMask, WalletConnect, Coinbase, etc.)
3. Approve the connection in your wallet

#### Step 2: Switch to Arbitrum (if needed)
- If you see **"Switch to Arbitrum"** button, click it
- Your wallet will prompt you to switch networks
- If Arbitrum is not added to your wallet, it will be added automatically

#### Step 3: Connect to Hyperliquid
1. After wallet is connected and on Arbitrum, click **"Connect Hyperliquid"** button
2. The system will:
   - Create a wallet client with your address
   - Connect to Hyperliquid API
   - Fetch your account data
   - Display your account balance and position info

### 4. Disconnect
- Click on your **address/account name** to open account modal
- Click **"Disconnect"** in the modal

## 🔍 Debugging

### Console Logs
When you click "Connect Hyperliquid", you'll see detailed logs:

```
🔄 Creating wallet client with address: 0x...
🔄 Target chain: Arbitrum One (ID: 42161)
✅ Wallet client created
✅ Hyperliquid exchange client created
🔄 Fetching user data from Hyperliquid...
🔄 Fetching clearinghouse state for address: 0x...
✅ Clearinghouse state received: {...}
✅ Account summary calculated: {...}
✅ Connected to Hyperliquid successfully
```

### Common Issues

**Issue**: "Wrong network" / "Switch to Arbitrum" button
- **Solution**: Click the button, it will automatically switch your wallet to Arbitrum

**Issue**: "No Ethereum provider found"
- **Solution**: Install MetaMask or another Web3 wallet extension

**Issue**: "Origin http://localhost:3000 not found on Allowlist"
- **Solution**: Go to cloud.reown.com and add `http://localhost:3000` to your project's allowlist
- For production, add your production domain

**Issue**: Connection succeeds but no account data shown
- **Solution**: Make sure your wallet has been used on Hyperliquid before
- Check console logs for specific API errors

## 🚀 Features

### Once Connected
- ✅ View real-time account balance
- ✅ View open positions
- ✅ Place orders (Market & Limit)
- ✅ Cancel orders
- ✅ View order history
- ✅ Deploy and manage trading bots
- ✅ Access paper trading

### Auto-Refresh
- Account data refreshes every 30 seconds while connected
- Manual refresh available by re-clicking "Connect Hyperliquid"

### Automatic Network Management
- Detects current network
- Prompts to switch if on wrong network
- Adds Arbitrum network if not present in wallet

## 📝 Important Notes

1. **Mainnet by Default**: The app connects to Arbitrum mainnet and Hyperliquid mainnet
2. **Testnet Mode**: Set `REACT_APP_TESTNET=true` in environment to use testnet
3. **Real Trading**: All trading operations are REAL - use with caution
4. **Paper Trading**: Available in Strategies page for risk-free testing

## 🔐 Security

- ✅ No private keys stored
- ✅ All transactions signed by your wallet
- ✅ Direct connection to Hyperliquid API
- ✅ No intermediary servers
- ✅ Open source and auditable

## 📞 Troubleshooting

If you encounter issues:
1. Check browser console for detailed error logs
2. Ensure wallet is unlocked
3. Ensure wallet is on Arbitrum network
4. Try disconnecting and reconnecting
5. Clear browser cache and refresh
6. Check Hyperliquid API status

## 🛠️ Development

To modify wallet configuration:
- Edit `src/config/wallet.ts`
- Update `src/contexts/WalletContext.tsx` for connection logic
- Modify `src/components/WalletConnectButton.tsx` for UI changes


