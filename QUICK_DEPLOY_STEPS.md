# 🚀 Quick Deploy Steps - Bot Runner with Logging

## Step 1: Create bot_logs table in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste this SQL:

```sql
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

5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 2: Deploy the updated bot-runner

### Option A: Via Supabase Dashboard (EASIEST - DO THIS!)

1. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions
2. Find "bot-runner" in the list
3. Click on it
4. Click "Edit Function" button
5. **Select ALL the code** in the editor (Ctrl+A)
6. **Delete it**
7. Open the file: `supabase/functions/bot-runner/index.ts` in your code editor
8. **Copy ALL the code** from that file
9. **Paste it** into the Supabase editor
10. Click "Deploy" button at the bottom
11. Wait for "Function deployed successfully" message

## Step 3: Test it!

1. Go to your app: https://hyperlandbot-kc7ni5p3k-memestreetmarkets.vercel.app
2. Login if needed
3. Go to "My Bots" page
4. Click "View Logs" on any running bot
5. **You should see logs appearing!** 🎉

If no logs yet:
- Click the "🧪 Test Bot Runner" button to manually trigger it
- Wait 30 seconds for the cron job to run
- Refresh the logs

## What You'll See:

- 📈 **Market Data**: Real prices from Hyperliquid
- 📊 **Signals**: When the bot wants to enter a trade
- 💰 **Trades**: When positions open/close
- ℹ️ **Info**: General bot activity
- ❌ **Errors**: If something goes wrong

## Troubleshooting:

**"Table bot_logs does not exist"**
- Run Step 1 again

**"No logs appearing"**
- Make sure you have a bot running (status = "running")
- Click "🧪 Test Bot Runner" to manually trigger
- Check Supabase Edge Function logs for errors

**"Still not working"**
- DM me the error from Supabase Edge Function logs

