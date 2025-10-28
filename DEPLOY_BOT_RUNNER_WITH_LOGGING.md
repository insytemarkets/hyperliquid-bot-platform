# 🚀 Deploy Bot Runner with Logging

## Step 1: Run SQL Schema in Supabase

Go to your Supabase SQL Editor and run this:

```sql
-- See supabase-bot-logs-schema.sql for the full schema
-- Or copy this quick version:

CREATE TABLE IF NOT EXISTS public.bot_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    bot_id TEXT REFERENCES public.bot_instances(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('info', 'trade', 'signal', 'error', 'market_data')),
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_logs_bot_id_idx ON public.bot_logs(bot_id);
CREATE INDEX IF NOT EXISTS bot_logs_created_at_idx ON public.bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS bot_logs_user_id_idx ON public.bot_logs(user_id);

ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bot logs" ON public.bot_logs;
CREATE POLICY "Users can view own bot logs" ON public.bot_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage logs" ON public.bot_logs;
CREATE POLICY "Service role can manage logs" ON public.bot_logs
    FOR ALL USING (true);
```

## Step 2: Deploy Updated Bot Runner

### Option A: Via Supabase Dashboard (EASIEST)

1. Go to Supabase Dashboard → Edge Functions → `bot-runner`
2. Click "Edit Function"
3. **Copy the entire contents** of `supabase/functions-dashboard-ready/bot-runner-with-logging.ts`
4. **Paste it** into the editor (replacing the old code)
5. Click "Deploy"

### Option B: Via CLI (if you have it working)

```bash
# In the Hyper directory
supabase functions deploy bot-runner --project-ref oqmaogkrkupqulcregpz
```

## Step 3: Verify It's Working

1. Go to your app: https://hyperlandbot-kc7ni5p3k-memestreetmarkets.vercel.app
2. Deploy a bot (or use an existing one)
3. Go to "My Bots" page
4. Click "View Logs" on any running bot
5. **You should see logs appearing every 30 seconds!**

## What Logs You'll See:

### 📈 Market Data Logs
```
Fetched market prices for 3 pairs
{
  "ETH": 2450.32,
  "BTC": 43210.50,
  "SOL": 98.75
}
```

### 📊 Signal Logs
```
LONG signal generated for ETH at $2450.32
```

### 💰 Trade Logs
```
Opened LONG position on ETH at $2450.32
```

```
Closed LONG position on ETH at $2475.80 (Take Profit) - P&L: $127.40
```

### ℹ️ Info Logs
```
Running OrderBookImbalanceStrategy strategy
Strategy execution complete - 2 open positions
```

### ❌ Error Logs
```
Bot execution error: Failed to fetch market data
```

## Troubleshooting

### No logs appearing?
1. Check that `bot_logs` table exists in Supabase
2. Verify the bot is actually running (status = 'running')
3. Check Supabase Edge Function logs for errors
4. Make sure the cron job is running (every 30 seconds)

### Logs not updating?
- Click the "🔄 Refresh" button in the logs UI
- Or toggle "Auto-refresh" off and on

### Want to test immediately?
Click the "🧪 Test Bot Runner" button on the My Bots page to manually trigger the bot-runner!

## 🎯 What's Next?

Once logs are working, you can:
1. **Improve strategies** - Replace the random 10% entry logic with real strategy logic
2. **Add more log types** - Track performance metrics, risk management, etc.
3. **Build analytics** - Use the logs to create performance dashboards
4. **Live trading** - Switch from paper to live mode (requires wallet connection)

---

**Current Status:**
- ✅ Bot persistence working
- ✅ Logs UI ready
- ✅ Database schema ready
- 🚧 Need to deploy updated bot-runner
- 🚧 Need to verify logs are working

