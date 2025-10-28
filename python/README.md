# 🔥 Hyperliquid Bot Engine - Python Edition

Real-time trading bot engine that runs 24/7 on Render.com

## **Features:**
- ✅ Real-time WebSocket connection to Hyperliquid
- ✅ Persistent bot execution (runs 24/7, not cron-based)
- ✅ Real-time logging via Supabase
- ✅ Order Book Imbalance strategy
- ✅ Momentum Breakout strategy
- ✅ Paper trading + Live trading support
- ✅ Automatic position management (SL/TP)

## **Architecture:**
```
Python Bot Engine (Render $7/month)
    ↓ WebSocket
Hyperliquid API (real-time market data)
    ↓ Writes to
Supabase Database (FREE)
    ↓ Realtime broadcasts
React Frontend (Vercel FREE)
```

## **Local Development:**

1. **Install dependencies:**
```bash
cd python
pip install -r requirements.txt
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. **Run locally:**
```bash
python bot_engine.py
```

## **Deploy to Render:**

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hyper-bot-engine.git
git push -u origin main
```

2. **Create Render service:**
- Go to https://render.com/
- Click "New +" → "Background Worker"
- Connect your GitHub repo
- Select the `python` directory
- Render will auto-detect `render.yaml`

3. **Set environment variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Supabase dashboard)

4. **Deploy!**
- Click "Create Background Worker"
- Render will build and deploy automatically
- Bot will start running 24/7

## **Cost:**
- **Render Starter Plan:** $7/month
- **Supabase Free Tier:** $0/month
- **Vercel Free Tier:** $0/month
- **Total:** $7/month 🔥

## **Monitoring:**
- View logs in Render dashboard
- Real-time bot activity in React frontend
- Supabase Realtime broadcasts all events instantly

## **Strategies:**

### **1. Order Book Imbalance**
- Analyzes bid/ask depth in real-time
- Enters when imbalance ratio > 3.0x or < 0.33x
- Fast scalping strategy

### **2. Momentum Breakout**
- Tracks 5-minute price momentum
- Enters on >2% or <-2% momentum
- Rides strong moves

## **Troubleshooting:**

**Bot not trading?**
- Check Render logs for errors
- Verify Supabase credentials
- Ensure bot status is "running" in database

**No real-time updates?**
- Check Supabase Realtime is enabled
- Verify frontend is subscribed to correct channels

**Want to add a new strategy?**
- Edit `bot_engine.py`
- Add new method like `run_your_strategy()`
- Push to GitHub → Render auto-deploys

