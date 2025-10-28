# 🚀 Supabase Edge Functions Setup Guide

## Overview
This guide will help you deploy the bot backend to Supabase Edge Functions so bots run 24/7 independently of the browser.

---

## Prerequisites
1. **Supabase CLI** installed
2. **Supabase project** already created
3. **Docker** installed (for local testing)

---

## Step 1: Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew (Mac)
brew install supabase/tap/supabase
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

---

## Step 3: Link Your Project

```bash
cd hyperliquid-bot-platform
supabase link --project-ref oqmaogkrkupqulcregpz
```

---

## Step 4: Update Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz
2. Navigate to **SQL Editor**
3. Create a **New Query**
4. Copy the contents of `supabase-schema-complete.sql`
5. Paste and click **Run**

This will create the tables:
- `strategies`
- `bot_instances`
- `bot_positions`
- `bot_trades`

---

## Step 5: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy deploy-bot
supabase functions deploy stop-bot  
supabase functions deploy pause-bot
supabase functions deploy get-bots
supabase functions deploy bot-runner
```

---

## Step 6: Set Up Environment Variables

Edge Functions need these environment variables:

```bash
# Set secrets for Edge Functions
supabase secrets set SUPABASE_URL=https://oqmaogkrkupqulcregpz.supabase.co
supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Where to find keys:**
- Go to Project Settings → API
- Copy `anon` public key
- Copy `service_role` key (⚠️ Keep this secret!)

---

## Step 7: Set Up Cron Job for Bot Runner

1. Go to **Database** → **Extensions**
2. Enable **pg_cron** extension
3. Go to **SQL Editor** and run:

```sql
-- Run bot-runner every 30 seconds
SELECT cron.schedule(
  'run-bots',
  '*/30 * * * * *',  -- Every 30 seconds
  $$
  SELECT
    net.http_post(
      url := 'https://oqmaogkrkupqulcregpz.supabase.co/functions/v1/bot-runner',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**Replace `YOUR_SERVICE_ROLE_KEY`** with your actual service role key.

---

## Step 8: Test Edge Functions

### Test Deploy Bot:
```bash
curl -X POST https://oqmaogkrkupqulcregpz.supabase.co/functions/v1/deploy-bot \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"strategy_id": "test_strategy_id"}'
```

### Test Get Bots:
```bash
curl https://oqmaogkrkupqulcregpz.supabase.co/functions/v1/get-bots \
  -H "Authorization: Bearer YOUR_USER_JWT"
```

---

## Step 9: Update Frontend

The frontend code needs to be updated to call these Edge Functions instead of running the bot engine in the browser.

---

## Architecture

```
Frontend (Vercel)
    ↓ API calls
Edge Functions (Supabase)
    ├─ deploy-bot       → Creates bot instance
    ├─ stop-bot         → Stops bot
    ├─ pause-bot        → Pauses/resumes bot
    ├─ get-bots         → Gets all user bots
    └─ bot-runner       → Runs every 30s (cron)
         ↓
    PostgreSQL Database
         ├─ bot_instances
         ├─ bot_positions
         └─ bot_trades
```

---

## Monitoring

### View Function Logs:
1. Go to **Edge Functions** in Supabase Dashboard
2. Click on a function
3. View **Logs** tab

### View Bot Status:
```sql
-- Check running bots
SELECT * FROM bot_instances WHERE status = 'running';

-- Check recent trades
SELECT * FROM bot_trades ORDER BY executed_at DESC LIMIT 10;

-- Check open positions
SELECT * FROM bot_positions WHERE status = 'open';
```

---

## Troubleshooting

### Functions not deploying?
- Make sure Supabase CLI is up to date: `supabase update`
- Check you're linked to the correct project: `supabase projects list`

### Cron job not running?
- Check if pg_cron extension is enabled
- View cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Bots not executing trades?
- Check bot-runner logs in Supabase Dashboard
- Verify bot status: `SELECT * FROM bot_instances;`
- Check error_count column

---

## Next Steps

1. ✅ Deploy Edge Functions
2. ✅ Set up cron job
3. ✅ Update frontend to use API calls
4. ✅ Test bot deployment and persistence
5. ✅ Monitor bot performance

---

## Important Notes

⚠️ **Service Role Key**: Keep this secret! Don't expose it in frontend code.

✅ **Bots run 24/7**: Even if you close the browser, bots keep running on Supabase servers.

✅ **Data persists**: All bot data is stored in PostgreSQL, survives page refreshes.

✅ **User isolation**: RLS policies ensure users only see their own bots.

