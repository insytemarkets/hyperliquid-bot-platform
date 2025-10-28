# 🔥 Deploy REAL Strategies with Hyperliquid Integration

## **What's New:**

### ✅ **REAL Hyperliquid Data:**
- Order book depth (L2 data)
- Recent trades
- Market stats
- Real-time price feeds

### ✅ **ACTUAL Strategy Logic:**
- **OrderBookImbalance**: Analyzes bid/ask depth, calculates imbalance ratios, generates signals
- **MomentumBreakout**: Tracks price momentum over time, detects >2% moves
- **CrossPairLag**: Monitors BTC movements, predicts alt coin follow-through

### ✅ **DETAILED Logging:**
```
📊 BTC Order Book Analysis
   Best Bid: $43,210.50
   Best Ask: $43,215.30
   Mid Price: $43,212.90
   Spread: 0.011%
   Bid Depth: 2,450,000
   Ask Depth: 1,890,000
   Imbalance Ratio: 1.30
   
🎯 BUY signal for BTC
   Price: $43,212.90
   Confidence: 72%
   Reason: Strong BID depth (ratio: 1.30, threshold: 3.0)
   
💰 Opened LONG position on BTC
   Entry: $43,212.90
   Size: 100 USDC
   Stop Loss: $42,780.78 (-1%)
   Take Profit: $44,077.16 (+2%)
   Confidence: 72%
```

## **🚀 Deployment Steps:**

### **Step 1: Copy the New Bot-Runner**

1. Open: `supabase/functions/bot-runner/index-v2.ts`
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)

### **Step 2: Deploy to Supabase**

1. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions/bot-runner
2. Click **"Edit Function"**
3. **Delete all existing code**
4. **Paste** the new code
5. Click **"Deploy"**

### **Step 3: Wait for Logs!**

The cron is already running every 5 seconds. Within 5-10 seconds you should see:

1. **Market Data Logs** (purple):
   - Order book analysis for each coin
   - Momentum calculations
   - Cross-pair analysis

2. **Signal Logs** (blue):
   - BUY/SELL signals with confidence
   - Detailed reasoning

3. **Trade Logs** (green):
   - Position opens/closes
   - P&L tracking

4. **Info Logs** (gray):
   - Position monitoring
   - Tick status

## **📊 What Each Strategy Does:**

### **Order Book Imbalance:**
- Fetches L2 order book from Hyperliquid
- Calculates bid depth vs ask depth (top 10 levels)
- If bid/ask ratio > 3.0 → BUY signal
- If bid/ask ratio < 0.33 → SELL signal
- Logs: bid depth, ask depth, spread, imbalance ratio

### **Momentum Breakout:**
- Compares current price to price from 5 trades ago
- If momentum > +2% → BUY signal
- If momentum < -2% → SELL signal
- Logs: current price, old price, momentum %, timespan

### **Cross-Pair Lag:**
- Monitors BTC price movement
- If BTC moves > 0.3%, expects alts to follow
- BTC up → BUY alts
- BTC down → SELL alts
- Logs: leader movement, expected follower movement

## **🎯 Expected Behavior:**

1. **First 5 seconds**: Bot fetches market data, logs analysis
2. **If signal found**: Opens position, logs trade details
3. **Every 5 seconds**: Monitors open positions, checks SL/TP
4. **On exit**: Closes position, logs P&L

## **🔧 Troubleshooting:**

### **If you see "No order book data":**
- Hyperliquid API might be rate limiting
- Try a different coin (ETH, SOL, BTC)

### **If you see "Insufficient historical data":**
- Momentum strategy needs 5+ trades in history
- Let it run for 30-60 seconds to build history

### **If you see "No leader coin data":**
- Cross-pair strategy needs BTC trades first
- Deploy a BTC-only bot first, then alts

## **✅ Verification:**

After deploying, check logs for:
- ✅ `📊 [COIN] Order Book Analysis` - Real data being fetched
- ✅ `📈 [COIN] Momentum Analysis` - Momentum being calculated
- ✅ `🔗 [COIN] Cross-Pair Analysis` - BTC correlation being tracked
- ✅ `🎯 [SIGNAL] signal for [COIN]` - Signals being generated
- ✅ `💰 Opened [SIDE] position` - Trades being executed

---

**TL;DR**: Copy `index-v2.ts` to Supabase bot-runner, deploy, wait 5 seconds, watch FIRE logs! 🔥

