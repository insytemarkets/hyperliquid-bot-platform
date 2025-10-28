# 🧪 Test Bot Runner Manually

## **The Problem:**
No logs are showing up because the bot-runner isn't being triggered automatically yet.

## **Quick Test Steps:**

### **1. Manually Trigger Bot-Runner (Test Button)**
On the "My Bots" page, click the **"🧪 Test Bot Runner"** button.

This will:
- Manually call the bot-runner Edge Function
- Generate logs immediately
- Show you if it's working

### **2. Check Browser Console**
Open browser console (F12) and look for:
```
📋 API: Fetching logs for bot: bot_xxxxx
✅ Retrieved X logs
```

### **3. If You See "Retrieved 0 logs":**

The bot-runner needs to be triggered. Let's set up the cron job:

#### **Option A: Set up 5-second cron (RECOMMENDED)**

Run this SQL in Supabase SQL Editor:

```sql
-- First, unschedule any existing cron
SELECT cron.unschedule('bot-runner-tick');

-- Schedule bot-runner to run every 5 seconds
SELECT cron.schedule(
  'bot-runner-tick',
  '*/5 * * * * *',  -- Every 5 seconds
  $$
  SELECT
    net.http_post(
      url := 'https://oqmaogkrkupqulcregpz.supabase.co/functions/v1/bot-runner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**⚠️ IMPORTANT:** Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key from:
https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/settings/api

#### **Option B: Manual Test (Quick)**

Just click the "🧪 Test Bot Runner" button on the My Bots page, then refresh the logs.

---

## **Expected Logs:**

Once bot-runner runs, you should see logs like:

```
🤖 Bot starting tick - Strategy: momentum_breakout
📊 Monitoring 3 pairs - Current prices
   { "ETH": 2450.32, "BTC": 43210.50, "SOL": 98.75 }
📈 Position Status: 0/3 positions open
🔍 Analyzing ETH at $2450.32 - No entry signal
🔍 Analyzing BTC at $43210.50 - No entry signal
✅ Tick complete - Next check in 5 seconds
```

---

## **Troubleshooting:**

### **If logs still don't show:**

1. **Check bot is running:**
   - Status should be "Running" (green badge)
   - If not, deploy a new bot

2. **Check bot_logs table exists:**
   Run in Supabase SQL Editor:
   ```sql
   SELECT * FROM bot_logs ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check RLS policies:**
   ```sql
   -- View RLS policies for bot_logs
   SELECT * FROM pg_policies WHERE tablename = 'bot_logs';
   ```

4. **Check browser console for errors:**
   - Look for Supabase auth errors
   - Look for "Failed to fetch logs" errors

---

## **TL;DR:**
1. Click "🧪 Test Bot Runner" button
2. Wait 2-3 seconds
3. Click "View Logs" on your bot
4. You should see logs!

If still no logs, the cron isn't set up. Run the SQL above to schedule it.

