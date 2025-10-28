# 🚀 Deploy Bot Runner NOW - Get Real-Time Logs!

## Why no logs?
The bot-runner code is updated locally, but **NOT deployed to Supabase yet**. You need to copy/paste it!

## 🔥 Quick Deploy (2 minutes):

### Step 1: Deploy Bot Runner to Supabase

1. **Open this file in your editor**: `supabase/functions/bot-runner/index.ts`
2. **Select ALL the code** (Ctrl+A)
3. **Copy it** (Ctrl+C)
4. **Go to Supabase**: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions/bot-runner
5. **Click "Edit Function"** button
6. **Select all the old code** (Ctrl+A)
7. **Paste the new code** (Ctrl+V)
8. **Click "Deploy"** at the bottom
9. Wait for "Function deployed successfully" ✅

### Step 2: Update Cron to 5 Seconds (Real-Time!)

1. **Go to Supabase SQL Editor**: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/sql/new
2. **Copy this SQL**:

```sql
-- Unschedule old job
SELECT cron.unschedule('bot-runner-tick');

-- Create new job - EVERY 5 SECONDS for real-time monitoring!
SELECT cron.schedule(
  'bot-runner-tick',
  '*/5 * * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://oqmaogkrkupqulcregpz.supabase.co/functions/v1/bot-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

3. **IMPORTANT**: Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key
4. **Click "Run"**

### Step 3: Test It!

1. Go to your app: https://hyperlandbot-kc7ni5p3k-memestreetmarkets.vercel.app
2. Go to "My Bots"
3. Click "View Logs" on any running bot
4. Click "🧪 Test Bot Runner" button
5. **Logs should appear within 5 seconds!** 🎉

## What You'll See Every 5 Seconds:

```
ℹ️ Running orderbook_imbalance strategy
📈 Fetched market prices for 3 pairs
   {
     "ETH": 2450.32,
     "BTC": 43210.50,
     "SOL": 98.75
   }
📊 LONG signal generated for ETH at $2450.32
💰 Opened LONG position on ETH at $2450.32
ℹ️ Strategy execution complete - 1 open positions
```

## Troubleshooting:

**Still no logs after 30 seconds?**
- Check Supabase Edge Function logs for errors
- Make sure the cron job is running: `SELECT * FROM cron.job WHERE jobname = 'bot-runner-tick';`
- Verify your service role key is correct

**Want to test immediately?**
- Click "🧪 Test Bot Runner" button on My Bots page
- Or manually invoke: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions/bot-runner

---

**TL;DR**: Copy/paste the bot-runner code to Supabase, update cron to 5 seconds, and you'll have real-time logs! 🔥

