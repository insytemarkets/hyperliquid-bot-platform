# 🔍 WHY NO TRADES? DEBUG GUIDE

## **The Problem:**
Bots are "running" for hours but **0 trades, 0 positions, 0 activity**

## **Possible Causes:**

### **1. Cron Job Not Actually Running** ❌
**Check:** Run this in Supabase SQL Editor:
```sql
SELECT 
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname LIKE '%bot%';

-- Check if it's actually executing
SELECT 
    status,
    return_message,
    start_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%bot%')
ORDER BY start_time DESC
LIMIT 10;
```

**Fix:** If no cron job exists, run `SETUP_CRON_JOB.sql`

---

### **2. Bot-Runner Has Wrong Code** ❌
**Check:** Look at your Supabase Edge Function dashboard
- Does it have the latest code from `supabase/functions/bot-runner/index.ts`?
- Or is it still an old version?

**Fix:** 
1. Go to Supabase Dashboard → Edge Functions → `bot-runner`
2. Copy/paste the ENTIRE content of `supabase/functions/bot-runner/index.ts`
3. Click "Deploy"

---

### **3. Strategy Has Wrong Coin Names** ❌
**Check:** Run this in Supabase SQL Editor:
```sql
SELECT 
    id,
    name,
    type,
    pairs
FROM strategies
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

**Expected:** `["BTC", "ETH", "SOL"]`
**NOT:** `["BTC-USD", "BTCUSDT", "BTC/USD"]`

**Fix:** Update strategy with correct coin names

---

### **4. Bot-Runner Crashing Silently** ❌
**Check:** Look at Supabase Edge Function logs
- Go to Supabase Dashboard → Edge Functions → `bot-runner` → Logs
- Look for errors

**Common errors:**
- `price.toFixed is not a function` (already fixed in latest code)
- `strategies is null` (JOIN failed)
- `No valid price data` (coin name mismatch)

---

### **5. Database RLS Blocking Inserts** ❌
**Check:** Run this in Supabase SQL Editor:
```sql
-- Try to manually insert a test trade
INSERT INTO bot_trades (
    id,
    bot_id,
    symbol,
    side,
    size,
    price,
    mode,
    executed_at
) VALUES (
    'test_trade_123',
    (SELECT id FROM bot_instances LIMIT 1),
    'BTC',
    'buy',
    0.001,
    95000,
    'paper',
    NOW()
);

-- If this fails, RLS is blocking it
```

**Fix:** Check RLS policies on `bot_trades` and `bot_positions` tables

---

## **🔥 QUICK FIX (DO THIS NOW):**

1. **Run the cron job manually** to see what happens:
```sql
-- In Supabase SQL Editor
SELECT net.http_post(
    url:='https://lwtfkkgbuycpmaxvvjgl.supabase.co/functions/v1/bot-runner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
) as request_id;
```

2. **Check the logs immediately after:**
```sql
SELECT 
    log_type,
    message,
    data,
    created_at
FROM bot_logs
ORDER BY created_at DESC
LIMIT 20;
```

3. **If no logs appear** → bot-runner is NOT running
4. **If logs appear but say "No valid price data"** → coin name mismatch
5. **If logs appear but no trades** → strategy logic is too conservative

---

## **🎯 Most Likely Issue:**

**The cron job is NOT actually running, OR the bot-runner code deployed on Supabase is an old version.**

**Solution:** 
1. Check Supabase Edge Functions dashboard
2. Verify `bot-runner` function exists
3. Verify it has the latest code
4. Verify cron job is set up (`SETUP_CRON_JOB.sql`)
5. Manually trigger it and watch the logs

