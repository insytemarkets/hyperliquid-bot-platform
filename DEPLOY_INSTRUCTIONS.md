# 🚀 Deploy Edge Functions - Copy/Paste Method

## Step 1: Run Database Schema ✅

1. Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/sql/new
2. Open `supabase-schema-complete.sql` in your editor
3. Copy ALL the SQL
4. Paste into Supabase SQL Editor
5. Click **"Run"**

You should see: "Setup complete! Tables created:"

---

## Step 2: Deploy Edge Functions

Go to: https://supabase.com/dashboard/project/oqmaogkrkupqulcregpz/functions

### For each function below:
1. Click "Create a new function"
2. Enter the function name
3. Copy/paste the code
4. Click "Deploy function"

---

## Function 1: `deploy-bot`

**Code location**: `supabase/functions-dashboard-ready/deploy-bot-standalone.ts`

Copy that entire file and paste it.

---

## Function 2: `get-bots`

I'll create simplified standalone versions of all 5 functions for you.

Actually - even EASIER: Let me show you how to use Supabase CLI through npx!

---

## ⚡ EASIEST METHOD - Use npx (no install needed!)

```bash
cd C:\Users\avery\OneDrive\Desktop\Hyper\hyperliquid-bot-platform

# Login
npx supabase login

# Link project
npx supabase link --project-ref oqmaogkrkupqulcregpz

# Deploy all functions
npx supabase functions deploy deploy-bot
npx supabase functions deploy stop-bot
npx supabase functions deploy pause-bot
npx supabase functions deploy get-bots
npx supabase functions deploy bot-runner
```

This uses `npx` which runs Supabase CLI without installing it globally!

---

## After Deployment

1. Set up cron job (see SUPABASE_EDGE_FUNCTIONS_SETUP.md)
2. Update frontend to call these APIs
3. Test!

