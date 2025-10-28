# ✅ Deployment Checklist

## Step 1: Run Database Schema ✅ (Do this FIRST!)

1. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/sql/new
2. Copy all content from: `supabase-schema-complete.sql`
3. Paste into SQL Editor
4. Click **"Run"**
5. You should see: "Setup complete! Tables created:"

---

## Step 2: Deploy Edge Functions

Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions

For each function below:
1. Click "Create a new function"
2. Enter function name exactly as shown
3. Copy/paste the code from the file
4. Click "Deploy function"

### Function 1: `deploy-bot` ✅ (You did this!)
File: `supabase/functions-dashboard-ready/deploy-bot-standalone.ts`

### Function 2: `get-bots`
File: `supabase/functions-dashboard-ready/get-bots-standalone.ts`

### Function 3: `stop-bot`
File: `supabase/functions-dashboard-ready/stop-bot-standalone.ts`

### Function 4: `pause-bot`
File: `supabase/functions-dashboard-ready/pause-bot-standalone.ts`

### Function 5: `bot-runner` ⭐ (MOST IMPORTANT)
File: `supabase/functions-dashboard-ready/bot-runner-standalone.ts`

---

## Step 3: Set Up Cron Job for bot-runner

1. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/database/extensions
2. Enable **pg_cron** extension
3. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/sql/new
4. Run this SQL:

```sql
-- Run bot-runner every 30 seconds
SELECT cron.schedule(
  'run-bots',
  '30 seconds',
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

**⚠️ IMPORTANT**: Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key from:
https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/settings/api

(Look for "service_role" key - it's secret, don't share it!)

---

## Step 4: Verify Everything Works

### Check bot-runner is running:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Check tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('strategies', 'bot_instances', 'bot_positions', 'bot_trades');
```

---

## What Each Function Does:

- **deploy-bot**: Creates a new bot instance when you click "Deploy" in frontend
- **get-bots**: Fetches all your bots with positions and performance
- **stop-bot**: Stops a running bot
- **pause-bot**: Pauses/resumes a bot
- **bot-runner**: **THE BRAIN** - Runs every 30s, executes all bot trades

---

## Next: Update Frontend

After all functions are deployed, we need to update the frontend to:
1. Remove browser-based bot engine
2. Call these Edge Function APIs instead
3. Display bot data from database

Then bots will run 24/7 independently! 🚀

